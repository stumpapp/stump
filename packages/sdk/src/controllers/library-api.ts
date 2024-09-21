import {
	Library,
	LibraryFilter,
	LibraryStats,
	LibraryStatsParams,
	PaginationQuery,
	UpdateLibrary,
} from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys, PageableAPIResult } from './types'
import { createRouteURLHandler } from './utils'

const LIBRARY_ROUTE = '/libraries'
const libraryURL = createRouteURLHandler(LIBRARY_ROUTE)

export class LibraryAPI extends APIBase {
	/**
	 * Fetch all libraries
	 */
	async get(params: LibraryFilter & PaginationQuery): Promise<PageableAPIResult<Library[]>> {
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

	async getStats({ id, ...params }: LibraryStatsParams & { id?: string }): Promise<LibraryStats> {
		const { data: stats } = await this.api.axios.get<LibraryStats>(
			libraryURL(id ? `/${id}/stats` : '/stats', params),
		)
		return stats
	}

	async update(id: string, payload: UpdateLibrary): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.post(libraryURL(id), payload)
		return updatedLibrary
	}

	async visit(id: string): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.put(libraryURL(`/last-visited/${id}`))
		return updatedLibrary
	}

	async getLastVisited(): Promise<Library | undefined> {
		const { data: library } = await this.api.axios.get(libraryURL('/last-visited'))
		return library
	}

	async delete(id: string): Promise<void> {
		await this.api.axios.delete(libraryURL(id))
	}

	async analyze(id: string): Promise<void> {
		await this.api.axios.get(libraryURL(`/${id}/analyze`))
	}

	get keys(): ClassQueryKeys<InstanceType<typeof LibraryAPI>> {
		return { get: 'get', getById: 'getById' }
	}
}
