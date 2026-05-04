import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Repo-root `.env` then `server/.env` (latter overrides). Run before any other server imports that read `process.env`. */
loadEnv({ path: path.resolve(__dirname, '../../../.env') })
loadEnv({ path: path.resolve(__dirname, '../../.env'), override: true })
