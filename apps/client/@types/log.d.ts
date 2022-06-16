declare enum LogLevel {
	Error = 'ERROR',
	Warn = 'WARN',
	Info = 'INFO',
	Debug = 'DEBUG',
}

interface Log {
	/**
	 * The id of the log.
	 */
	id: string;
	/**
	 * The level of the log.
	 */
	level: LogLevel;
	/**
	 * The message of the log.
	 */
	message: string;
	/**
	 * The timestamp of the log.
	 */
	createdAt: Date;
}

type Logs = Log[];
