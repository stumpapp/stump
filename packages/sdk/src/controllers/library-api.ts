import { Library } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys, PageableAPIResult } from './types'
import { createRouteURLHandler } from './utils'

const LIBRARY_ROUTE = '/libraries'
const libraryURL = createRouteURLHandler(LIBRARY_ROUTE)

export class LibraryAPI extends APIBase {
	/**
	 * Fetch all libraries
	 */
	async get(
		params: Record<string, unknown> = { unpaged: true },
	): Promise<PageableAPIResult<Library[]>> {
		const { data: libraries } = await this.api.axios.get<PageableAPIResult<Library[]>>(
			libraryURL('', params),
		)
		return libraries
	}

	/**
	 * Fetch library by ID
	 */
	async getById(id: string): Promise<Library> {
		const { data: library } = await this.api.axios.get<Library>(libraryURL(id))
		return library
	}

	get keys(): ClassQueryKeys<InstanceType<typeof LibraryAPI>> {
		return { get: 'get', getById: 'getById' }
	}
}
