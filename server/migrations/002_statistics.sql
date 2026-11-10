-- Statistics are served from two materialized views, refreshed by server/statsRefresh.ts.
-- A visitor's request only reads a few small pre-aggregated rows, however many games exist.

-- Hash indexes have no key-size limit, so a very long name in a PGN can't make an upload fail
CREATE INDEX games_white_player_lower_idx ON games USING hash (lower(white_player));
CREATE INDEX games_black_player_lower_idx ON games USING hash (lower(black_player));

CREATE TABLE stats_elo_bands (
  key      text PRIMARY KEY,
  label    text NOT NULL,
  min_elo  integer, -- NULL only for the "unrated" band, which no rating can match
  max_elo  integer, -- Exclusive. NULL means no upper limit.
  position integer NOT NULL
);

INSERT INTO stats_elo_bands (key, label, min_elo, max_elo, position) VALUES
  ('beginner',     'Beginner',     0,    800,  1),
  ('novice',       'Novice',       800,  1200, 2),
  ('intermediate', 'Intermediate', 1200, 1600, 3),
  ('advanced',     'Advanced',     1600, 2000, 4),
  ('expert',       'Expert',       2000, 2400, 5),
  ('master',       'Master',       2400, NULL, 6),
  ('unrated',      'Unrated',      NULL, NULL, 7);

-- One row per analyzed game, so accuracy can be aggregated without re-reading every evaluation.
-- Derived from game_analyses, which never changes, so a row can never go stale.
-- Accuracy is NULL for a side that made no moves.
CREATE TABLE game_analysis_stats (
  game_id            text PRIMARY KEY REFERENCES games (id) ON DELETE CASCADE,
  white_accuracy     real,
  black_accuracy     real,
  white_acpl         real NOT NULL,
  black_acpl         real NOT NULL,
  white_inaccuracies integer NOT NULL,
  black_inaccuracies integer NOT NULL,
  white_mistakes     integer NOT NULL,
  black_mistakes     integer NOT NULL,
  white_blunders     integer NOT NULL,
  black_blunders     integer NOT NULL
);

-- Ratings come from uploaded PGN text, so anything implausible counts as no rating
CREATE FUNCTION stats_rating(elo integer) RETURNS integer
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT CASE WHEN elo BETWEEN 1 AND 4000 THEN elo END $$;

-- The table is schema-qualified because Postgres builds materialized views with an empty search_path
CREATE FUNCTION stats_elo_band(rating integer) RETURNS text
  LANGUAGE sql STABLE
  AS $$
    SELECT COALESCE(
      (SELECT key FROM public.stats_elo_bands
       WHERE rating >= min_elo AND (max_elo IS NULL OR rating < max_elo)),
      'unrated')
  $$;

-- Full moves, in tens, with everything from 80 moves up in one bucket
CREATE FUNCTION stats_length_bucket(plies integer) RETURNS text
  LANGUAGE sql IMMUTABLE
  AS $$ SELECT LEAST(((plies + 1) / 2) / 10 * 10, 80)::text $$;

CREATE FUNCTION stats_gap_bucket(white_rating integer, black_rating integer) RETURNS text
  LANGUAGE sql IMMUTABLE
  AS $$
    SELECT CASE
      WHEN white_rating = black_rating THEN NULL -- No favorite
      WHEN abs(white_rating - black_rating) < 50 THEN '0'
      WHEN abs(white_rating - black_rating) < 100 THEN '50'
      WHEN abs(white_rating - black_rating) < 200 THEN '100'
      WHEN abs(white_rating - black_rating) < 400 THEN '200'
      ELSE '400'
    END
  $$;

-- A game's band comes from the average of both ratings, and it needs both.
-- Games with no moves played were never really games, so they aren't counted.
CREATE VIEW stats_game_facts AS
SELECT
  g.id, g.game_type, g.winner, g.termination_type, g.moves_count, g.played_date,
  g.source, g.white_player, g.black_player,
  left(g.time_control, 32) AS time_control,
  left(g.eco_code, 32) AS eco_code,
  r.white_rating, r.black_rating,
  (r.white_rating + r.black_rating) / 2 AS avg_rating,
  stats_elo_band((r.white_rating + r.black_rating) / 2) AS elo_band,
  CASE WHEN g.initial_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    THEN g.moves ->> 0 END AS first_move
FROM games g
CROSS JOIN LATERAL (
  SELECT stats_rating(g.white_elo) AS white_rating, stats_rating(g.black_elo) AS black_rating
) r
WHERE g.moves_count > 0;

-- Each game is counted once per dimension, for its time mode and rating band.
-- Any filter or breakdown on the page is then just a SUM over this small table.
-- wins/losses are from White's side; "favorite" is the higher-rated player.
CREATE MATERIALIZED VIEW stats_rollup AS
SELECT
  f.game_type, f.elo_band, d.dimension, d.bucket,
  count(*)::int AS games,
  count(*) FILTER (WHERE f.winner = 'white')::int AS wins,
  count(*) FILTER (WHERE f.winner = 'draw')::int AS draws,
  count(*) FILTER (WHERE f.winner = 'black')::int AS losses,
  sum(f.moves_count)::bigint AS plies,
  count(*) FILTER (WHERE (f.white_rating > f.black_rating AND f.winner = 'white')
                      OR (f.black_rating > f.white_rating AND f.winner = 'black'))::int AS favorite_wins,
  count(*) FILTER (WHERE (f.white_rating < f.black_rating AND f.winner = 'white')
                      OR (f.black_rating < f.white_rating AND f.winner = 'black'))::int AS underdog_wins,
  count(a.game_id)::int AS analyzed,
  (count(a.white_accuracy) + count(a.black_accuracy))::int AS accuracy_sides,
  (COALESCE(sum(a.white_accuracy), 0) + COALESCE(sum(a.black_accuracy), 0))::float8 AS accuracy_sum,
  COALESCE(sum(a.white_acpl + a.black_acpl), 0)::float8 AS acpl_sum,
  COALESCE(sum(a.white_inaccuracies + a.black_inaccuracies), 0)::bigint AS inaccuracies,
  COALESCE(sum(a.white_mistakes + a.black_mistakes), 0)::bigint AS mistakes,
  COALESCE(sum(a.white_blunders + a.black_blunders), 0)::bigint AS blunders
FROM stats_game_facts f
LEFT JOIN game_analysis_stats a ON a.game_id = f.id
CROSS JOIN LATERAL (VALUES
  ('all', 'all'),
  ('termination', COALESCE(f.termination_type, 'unknown')),
  ('length', stats_length_bucket(f.moves_count)),
  ('opening', f.eco_code),
  ('first_move', left(f.first_move, 16)),
  ('month', to_char(f.played_date, 'YYYY-MM')),
  ('time_control', f.time_control),
  ('source', f.source),
  ('rating', (f.avg_rating / 100 * 100)::text),
  ('gap', stats_gap_bucket(f.white_rating, f.black_rating))
) AS d (dimension, bucket)
WHERE d.bucket IS NOT NULL
GROUP BY f.game_type, f.elo_band, d.dimension, d.bucket;

CREATE UNIQUE INDEX stats_rollup_key_idx ON stats_rollup (game_type, elo_band, dimension, bucket);

-- Leaderboards and name suggestions. Placeholder names are not real players.
CREATE MATERIALIZED VIEW stats_players AS
SELECT
  lower(s.name) AS player_key,
  max(s.name) AS name,
  f.game_type, f.elo_band,
  count(*)::int AS games,
  count(*) FILTER (WHERE f.winner = s.color)::int AS wins,
  count(*) FILTER (WHERE f.winner = 'draw')::int AS draws,
  count(*) FILTER (WHERE f.winner IN ('white', 'black') AND f.winner <> s.color)::int AS losses,
  max(s.rating) AS peak_rating
FROM stats_game_facts f
CROSS JOIN LATERAL (VALUES
  ('white', f.white_player, f.white_rating),
  ('black', f.black_player, f.black_rating)
) AS s (color, name, rating)
WHERE length(s.name) <= 64 AND lower(s.name) NOT IN ('anonymous', 'unknown')
GROUP BY lower(s.name), f.game_type, f.elo_band;

CREATE UNIQUE INDEX stats_players_key_idx ON stats_players (player_key, game_type, elo_band);
CREATE INDEX stats_players_prefix_idx ON stats_players (player_key text_pattern_ops);

-- A single row recording when the views were last rebuilt and what data they reflect
CREATE TABLE stats_refresh (
  id           boolean PRIMARY KEY DEFAULT true CHECK (id),
  refreshed_at timestamptz NOT NULL,
  fingerprint  text NOT NULL
);

INSERT INTO stats_refresh (refreshed_at, fingerprint) VALUES (now(), '');
