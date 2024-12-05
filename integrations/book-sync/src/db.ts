import { PGlite } from '@electric-sql/pglite'

import { getConfigVar, getDefaultConfigDir } from './config'

// TODO: dir or file?
export const db = new PGlite(getConfigVar('DB_URL', getDefaultConfigDir()))
