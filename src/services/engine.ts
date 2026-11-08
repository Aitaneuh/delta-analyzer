/**
 * Runs Stockfish in a Web Worker and speaks UCI to it.
 * Uses the single-threaded lite build: small, and needs no special server headers.
 */
import engineUrl from 'stockfish/bin/stockfish-19-lite-single.js?url'
import wasmUrl from 'stockfish/bin/stockfish-19-lite-single.wasm?url'

export const MATE_SCORE = 10000

/** A position's score from White's point of view. */
export interface EngineEval {
  cp: number // Forced mates are stored as +/-MATE_SCORE
  mate: number | null // Moves to mate. 0 means the position is already checkmate.
  best: string | null // UCI, e.g. "e2e4"
}

export interface EngineLimits {
  depth: number
  moveTimeMs: number
}

export interface PositionEvaluator {
  evaluate(fen: string, limits: EngineLimits): Promise<EngineEval>
  terminate(): void
}

export class EngineStoppedError extends Error {}

const SCORE_LINE = /^info .*\bscore (cp|mate) (-?\d+)\b(?! (?:lower|upper)bound)/

/** Reads a UCI score, which is relative to the side to move, as a White-relative score. */
export function parseScore(
  line: string,
  whiteToMove: boolean,
): Pick<EngineEval, 'cp' | 'mate'> | null {
  const match = line.match(SCORE_LINE)
  if (!match) return null

  const value = parseInt(match[2]!, 10)
  const sign = whiteToMove ? 1 : -1

  if (match[1] === 'cp') return { cp: value * sign, mate: null }
  // "mate 0" means the side to move has already been mated
  const winning = value > 0 ? sign : -sign
  return { cp: winning * MATE_SCORE, mate: value === 0 ? 0 : value * sign }
}

export class StockfishEngine implements PositionEvaluator {
  private worker: Worker
  private listener: ((line: string) => boolean) | null = null
  private rejectPending: ((reason: Error) => void) | null = null
  private ready: Promise<void>

  constructor() {
    // The engine reads the location of its .wasm file from the URL hash
    const wasm = new URL(wasmUrl, window.location.href).href
    this.worker = new Worker(`${engineUrl}#${encodeURIComponent(wasm)}`)
    this.worker.onmessage = (event) => {
      if (this.listener?.(String(event.data))) this.settle()
    }
    this.worker.onerror = () => {
      this.rejectPending?.(new Error('Stockfish could not start in this browser.'))
      this.settle()
    }
    this.ready = this.start()
  }

  private async start(): Promise<void> {
    await this.request('uci', (line) => line === 'uciok')
    this.worker.postMessage('setoption name Hash value 32')
    this.worker.postMessage('ucinewgame')
    await this.request('isready', (line) => line === 'readyok')
  }

  private settle(): void {
    this.listener = null
    this.rejectPending = null
  }

  /** Sends a command and resolves once `isDone` accepts a line of output. */
  private request(command: string, isDone: (line: string) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.rejectPending = reject
      this.listener = (line) => {
        const done = isDone(line)
        if (done) resolve()
        return done
      }
      this.worker.postMessage(command)
    })
  }

  async evaluate(fen: string, limits: EngineLimits): Promise<EngineEval> {
    await this.ready

    const whiteToMove = fen.split(' ')[1] === 'w'
    let score: Pick<EngineEval, 'cp' | 'mate'> = { cp: 0, mate: null }
    let best: string | null = null

    this.worker.postMessage(`position fen ${fen}`)
    await this.request(`go depth ${limits.depth} movetime ${limits.moveTimeMs}`, (line) => {
      score = parseScore(line, whiteToMove) ?? score
      if (!line.startsWith('bestmove')) return false

      const move = line.split(' ')[1]
      best = move && move !== '(none)' ? move : null
      return true
    })

    return { ...score, best }
  }

  terminate(): void {
    this.worker.terminate()
    this.rejectPending?.(new EngineStoppedError())
    this.settle()
  }
}
