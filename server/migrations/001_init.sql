CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lichess_id    text NOT NULL UNIQUE,
  username      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY, -- SHA-256 of the cookie value, so a database leak exposes no session
  user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE games (
  id               text PRIMARY KEY,
  content_hash     text NOT NULL UNIQUE, -- Detects the same game being uploaded twice
  uploaded_by      uuid REFERENCES users (id) ON DELETE SET NULL,
  imported_at      timestamptz NOT NULL DEFAULT now(),

  source           text NOT NULL,
  link             text,
  event            text NOT NULL,
  played_date      date,

  white_player     text NOT NULL,
  black_player     text NOT NULL,
  white_elo        integer,
  black_elo        integer,
  white_country    text,
  black_country    text,
  white_avatar     text,
  black_avatar     text,

  result           text NOT NULL,
  winner           text,
  termination      text,
  termination_type text,

  time_control     text,
  game_type        text NOT NULL,
  eco_code         text,
  opening_name     text,

  pgn              text NOT NULL,
  initial_fen      text NOT NULL,
  final_fen        text,
  moves_count      integer NOT NULL,
  has_annotations  boolean NOT NULL,
  moves            jsonb NOT NULL
);

CREATE INDEX games_imported_at_idx ON games (imported_at DESC, id);
CREATE INDEX games_played_date_idx ON games (played_date);
CREATE INDEX games_white_elo_idx ON games (white_elo);
CREATE INDEX games_black_elo_idx ON games (black_elo);
CREATE INDEX games_eco_code_idx ON games (eco_code text_pattern_ops);
CREATE INDEX games_game_type_idx ON games (game_type);
CREATE INDEX games_white_player_trgm_idx ON games USING gin (white_player gin_trgm_ops);
CREATE INDEX games_black_player_trgm_idx ON games USING gin (black_player gin_trgm_ops);
CREATE INDEX games_event_trgm_idx ON games USING gin (event gin_trgm_ops);

CREATE TABLE game_analyses (
  game_id     text PRIMARY KEY REFERENCES games (id) ON DELETE CASCADE,
  engine      text NOT NULL,
  depth       integer NOT NULL,
  evals       jsonb NOT NULL,
  analyzed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Uploaded games are permanent: the application can only insert them.
-- The moderation tool (server/admin.ts) sets delta.allow_moderation for legally required changes.
CREATE FUNCTION protect_permanent_row() RETURNS trigger AS $$
BEGIN
  IF current_setting('delta.allow_moderation', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'Uploaded games are permanent and cannot be changed or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_are_permanent
  BEFORE UPDATE OR DELETE ON games
  FOR EACH ROW EXECUTE FUNCTION protect_permanent_row();

CREATE TRIGGER games_cannot_be_truncated
  BEFORE TRUNCATE ON games
  FOR EACH STATEMENT EXECUTE FUNCTION protect_permanent_row();

CREATE TRIGGER analyses_are_permanent
  BEFORE UPDATE OR DELETE ON game_analyses
  FOR EACH ROW EXECUTE FUNCTION protect_permanent_row();

CREATE TRIGGER analyses_cannot_be_truncated
  BEFORE TRUNCATE ON game_analyses
  FOR EACH STATEMENT EXECUTE FUNCTION protect_permanent_row();
