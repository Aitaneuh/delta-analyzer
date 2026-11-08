export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Calls the site's own API. Throws ApiError with a message that can be shown to the user. */
export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}) {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0)
  }

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = (data as { error?: unknown } | null)?.error
    throw new ApiError(
      typeof message === 'string' ? message : 'Something went wrong.',
      response.status,
    )
  }
  return data as T
}
