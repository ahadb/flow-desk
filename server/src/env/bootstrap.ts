import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Canonical local env: repo-root `.env` only (same file Vite uses via `envDir`). */
loadEnv({ path: path.resolve(__dirname, '../../../.env') })
