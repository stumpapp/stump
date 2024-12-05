import winston from 'winston'

import { getConfigVar } from './config'

export const logger = winston.createLogger({
	level: getConfigVar('STUMP_LOG_VERBOSITY', 'info'),
	format: winston.format.json(),
	defaultMeta: { service: 'stump-book-sync' },
	transports: [
		//
		// - Write all logs with importance level of `error` or higher to `error.log`
		//   (i.e., error, fatal, but not other levels)
		//
		new winston.transports.File({ filename: 'error.log', level: 'error' }),
		//
		// - Write all logs with importance level of `info` or higher to `combined.log`
		//   (i.e., fatal, error, warn, and info, but not trace)
		//
		new winston.transports.File({ filename: 'combined.log' }),
	],
})

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
	logger.add(
		new winston.transports.Console({
			format: winston.format.simple(),
		}),
	)
}
