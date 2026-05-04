import { safeParseParsedOrderFilter, type ParsedOrderFilter } from '../../../shared/nlp/parsedOrderFilter.js'
import { getOpenAIClient, openaiModel } from './openaiClient.js'

const SYSTEM_PROMPT = `You convert natural-language blotter filter requests into a single JSON object.

Rules:
- Output ONLY valid JSON (no markdown fences, no commentary).
- Use keys only from this vocabulary; omit keys you cannot infer.
- Use lowercase for side: "buy" | "sell".
- status and timeInForce must be arrays of allowed string literals when present.
- For "open" or "working" orders, use status: ["pending_new","new","partially_filled"] as appropriate.
- If the user gives no usable filter constraints, return {}.
- Never invent symbols or ids; if unclear, omit those fields.
`

export type ParseOrderFilterNlpResult =
  | { ok: true; filter: ParsedOrderFilter }
  | { ok: false; error: 'empty_text' | 'openai_unconfigured' | 'openai_error' | 'invalid_json' | 'validation_failed'; message: string; zodIssues?: unknown }

export async function parseOrderFilterFromNlp(text: string): Promise<ParseOrderFilterNlpResult> {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, error: 'empty_text', message: 'Request body must include non-empty "text".' }
  }

  const client = getOpenAIClient()
  if (!client) {
    return {
      ok: false,
      error: 'openai_unconfigured',
      message: 'Set OPENAI_API_KEY in the server environment to enable NLP filter parsing.',
    }
  }

  let rawContent: string | null | undefined
  try {
    const completion = await client.chat.completions.create({
      model: openaiModel(),
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: trimmed },
      ],
    })
    rawContent = completion.choices[0]?.message?.content
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, error: 'openai_error', message }
  }

  if (rawContent == null || rawContent.trim() === '') {
    return { ok: false, error: 'openai_error', message: 'OpenAI returned an empty message.' }
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent) as unknown
  } catch {
    return { ok: false, error: 'invalid_json', message: 'Model output was not valid JSON.' }
  }

  const zod = safeParseParsedOrderFilter(parsedJson)
  if (!zod.success) {
    return {
      ok: false,
      error: 'validation_failed',
      message: 'Model JSON failed schema validation.',
      zodIssues: zod.error.flatten(),
    }
  }

  return { ok: true, filter: zod.data }
}
