export enum LogLevel {
	Error = 'ERROR',
	Warn = 'WARN',
	Info = 'INFO',
	Debug = 'DEBUG',
}

export interface Log {
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

export interface LogFileMeta {
	path: string;
	size: number;
	modified: string;
}

export type Logs = Log[];
