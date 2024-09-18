import { API } from './axios'
import { APIResult } from './types'

export function getCompletedBooksStats(): Promise<APIResult<unknown>> {
	return API.get('/stats/completed-books')
}

export const statsApi = {
	getCompletedBooksStats,
}

export const statsQueryKeys: Record<keyof typeof statsApi, string> = {
	getCompletedBooksStats: 'stats.getCompletedBooksStats',
}
