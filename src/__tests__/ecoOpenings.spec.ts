import { describe, it, expect } from 'vitest'
import { getEcoOpeningName } from '../data/ecoOpenings'

describe('getEcoOpeningName', () => {
  it('names well-known codes', () => {
    expect(getEcoOpeningName('B20')).toBe('Sicilian Defense')
    expect(getEcoOpeningName('C50')).toBe('Italian Game')
    expect(getEcoOpeningName('C60')).toBe('Ruy Lopez')
    expect(getEcoOpeningName('D00')).toBe("Queen's Pawn Game")
    expect(getEcoOpeningName('B07')).toBe('Pirc Defense')
    expect(getEcoOpeningName('E60')).toBe("King's Indian Defense")
  })

  it('covers every code from A00 to E99', () => {
    const missing: string[] = []
    for (const letter of 'ABCDE') {
      for (let number = 0; number < 100; number++) {
        const code = `${letter}${String(number).padStart(2, '0')}`
        if (!getEcoOpeningName(code)) missing.push(code)
      }
    }
    expect(missing).toEqual([])
  })

  it('ignores case and surrounding spaces', () => {
    expect(getEcoOpeningName(' c60 ')).toBe('Ruy Lopez')
  })

  it('returns null for anything else', () => {
    expect(getEcoOpeningName(null)).toBeNull()
    expect(getEcoOpeningName('')).toBeNull()
    expect(getEcoOpeningName('F00')).toBeNull()
    expect(getEcoOpeningName('__proto__')).toBeNull()
  })
})
