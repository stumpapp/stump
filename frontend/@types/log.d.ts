declare enum LogLevel {
	Error = 'error',
	Warn = 'warn',
	Info = 'info',
	Debug = 'debug',
}

interface Log {
	/**
	 * The id of the log.
	 */
	id: number;
	/**
	 * The level of the log.
	 */
	level: LogLevel;
	/**
	 * The message of the log.
	 */
	message: string;
	// TODO: see if this maps correctly
	created_at: Date;
}

type Logs = Log[];
