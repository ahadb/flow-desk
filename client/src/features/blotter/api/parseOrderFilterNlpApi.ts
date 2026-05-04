import type { ParsedOrderFilter } from '../nlp/parsedOrderFilter'

export type ParseOrderFilterNlpErrorBody = {
  error: string
  message: string
  zodIssues?: unknown
}

export async function fetchParsedOrderFilterFromNlp(text: string): Promise<ParsedOrderFilter> {
  const res = await fetch('/nlp/parse-order-filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  const body: unknown = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'message' in body && typeof (body as ParseOrderFilterNlpErrorBody).message === 'string'
        ? (body as ParseOrderFilterNlpErrorBody).message
        : res.statusText
    throw new Error(msg || `NLP parse failed (${res.status})`)
  }

  if (typeof body !== 'object' || body === null || !('filter' in body)) {
    throw new Error('Invalid response shape from /nlp/parse-order-filter')
  }

  return (body as { filter: ParsedOrderFilter }).filter
}
