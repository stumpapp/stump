import { APIBase } from '../base'
import { TopBookFormatsData } from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the stats API
 */
const STATS_ROUTE = '/stats'
/**
 * A helper function to format the URL for stats API routes with optional query parameters
 */
const statsURL = createRouteURLHandler(STATS_ROUTE)

export class StatsAPI extends APIBase {
	async completedBooks() {
		const { data } = await this.axios.get<unknown>(statsURL('/completed-books'))
		return data
	}

	async topFormats() {
		const { data } = await this.axios.get<TopBookFormatsData[]>(statsURL('/top-formats'))
		return data
	}

	get keys(): ClassQueryKeys<InstanceType<typeof StatsAPI>> {
		return {
			completedBooks: 'stats.completedBooks',
			topFormats: 'stats.topFormats',
		}
	}
}
