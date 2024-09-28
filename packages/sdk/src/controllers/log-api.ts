import { Log, LogFilter, LogMetadata, Pageable, PaginationQuery, QueryOrder } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the log API
 */
const LOG_ROUTE = '/logs'
/**
 * A helper function to format the URL for log API routes with optional query parameters
 */
const logURL = createRouteURLHandler(LOG_ROUTE)

/**
 * The log API controller, used for interacting with the log endpoints of the Stump API
 */
export class LogAPI extends APIBase {
	/**
	 * Fetch all logs
	 */
	async get(params?: LogFilter & PaginationQuery & Partial<QueryOrder>): Promise<Pageable<Log[]>> {
		const { data: logs } = await this.axios.get<Pageable<Log[]>>(logURL('', params))
		return logs
	}

	/**
	 * Delete all **persisted** logs in the database
	 */
	async clear(params?: LogFilter): Promise<void> {
		await this.axios.delete(logURL('', params))
	}

	/**
	 * Fetch the metadata for the log file
	 */
	async getFileMetadata(): Promise<LogMetadata> {
		const { data: metadata } = await this.axios.get<LogMetadata>(logURL('file'))
		return metadata
	}

	/**
	 * Delete the log file
	 */
	async deleteFile(): Promise<void> {
		await this.axios.delete(logURL('file'))
	}

	/**
	 * The query keys for the log API, used for caching
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof LogAPI>> {
		return {
			clear: 'log.clear',
			deleteFile: 'log.deleteFile',
			get: 'log.get',
			getFileMetadata: 'log.getFileMetadata',
		}
	}
}
