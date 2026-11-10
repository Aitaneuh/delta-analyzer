import { describe, it, expect } from 'vitest'
import { bandLabel, monthSeries, scoreOf, timeControlLabel, type StatsRow } from '../services/stats'

const month = (key: string, games: number) => ({ key, games }) as StatsRow

describe('monthSeries', () => {
  const now = new Date(2026, 10, 15) // November 2026

  it('fills empty months between the first and the latest', () => {
    const series = monthSeries([month('2026-08', 3), month('2026-10', 1)], 36, now)
    expect(series).toEqual([
      { key: '2026-08', value: 3 },
      { key: '2026-09', value: 0 },
      { key: '2026-10', value: 1 },
    ])
  })

  it('keeps only the most recent months, across years', () => {
    const series = monthSeries([month('2020-01', 1), month('2026-01', 2)], 3, now)
    expect(series.map((item) => item.key)).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  it('ignores dates in the future', () => {
    expect(monthSeries([month('2031-01', 5)], 36, now)).toEqual([])
  })
})

it('formats time controls as minutes plus increment', () => {
  expect(timeControlLabel('300+3')).toBe('5+3')
  expect(timeControlLabel('600')).toBe('10 min')
  expect(timeControlLabel('90+0')).toBe('1.5+0')
  expect(timeControlLabel('1/259200')).toBe('1/259200')
})

it('labels rating bands with their range', () => {
  const band = (min_elo: number | null, max_elo: number | null) => ({
    key: 'x',
    label: 'Band',
    min_elo,
    max_elo,
  })
  expect(bandLabel(band(0, 800), 'x')).toBe('Band (<800)')
  expect(bandLabel(band(800, 1200), 'x')).toBe('Band (800–1199)')
  expect(bandLabel(band(2400, null), 'x')).toBe('Band (2400+)')
  expect(bandLabel(band(null, null), 'x')).toBe('Band')
})

it('scores a draw as half a point', () => {
  expect(scoreOf({ wins: 1, draws: 2, losses: 1 })).toBe(0.5)
  expect(scoreOf({ wins: 0, draws: 0, losses: 0 })).toBeNull()
})
