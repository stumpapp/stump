import { TopBookFormatsData } from '@stump/types'

import { API } from './axios'
import { APIResult } from './types'

export function getCompletedBooksStats(): Promise<APIResult<unknown>> {
	return API.get('/stats/completed-books')
}

export function getTopBookFormats(): Promise<APIResult<TopBookFormatsData[]>> {
	return API.get('/stats/top-formats')
}

export const statsApi = {
	getCompletedBooksStats,
	getTopBookFormats,
}

export const statsQueryKeys: Record<keyof typeof statsApi, string> = {
	getCompletedBooksStats: 'stats.getCompletedBooksStats',
	getTopBookFormats: 'stats.getTopBookFormats',
}
