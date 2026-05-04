import OpenAI from 'openai'

let cached: OpenAI | null | undefined

/**
 * Lazily construct the official OpenAI client. Returns `null` when `OPENAI_API_KEY` is missing
 * so routes can return a clear 503 instead of throwing at import time.
 */
export function getOpenAIClient(): OpenAI | null {
  if (cached !== undefined) return cached
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    cached = null
    return null
  }
  cached = new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    organization: process.env.OPENAI_ORG_ID?.trim() || undefined,
    project: process.env.OPENAI_PROJECT_ID?.trim() || undefined,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 45_000,
    maxRetries: 2,
  })
  return cached
}

export function openaiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}
