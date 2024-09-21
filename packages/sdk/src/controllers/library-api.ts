import {
	CleanLibraryResponse,
	CreateLibrary,
	GenerateLibraryThumbnails,
	Library,
	LibraryFilter,
	LibraryStats,
	LibraryStatsParams,
	PaginationQuery,
	PatchLibraryThumbnail,
	UpdateLibrary,
	UpdateLibraryExcludedUsers,
	User,
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
	async get(params?: LibraryFilter & PaginationQuery): Promise<PageableAPIResult<Library[]>> {
		const { data: libraries } = await this.api.axios.get<PageableAPIResult<Library[]>>(
			libraryURL('', params),
		)
		return libraries
	}

	/**
	 * Fetch library by ID
	 */
	async getByID(id: string): Promise<Library> {
		const { data: library } = await this.api.axios.get<Library>(libraryURL(id))
		return library
	}

	async create(payload: CreateLibrary): Promise<Library> {
		const { data: createdLibrary } = await this.api.axios.post<Library>(libraryURL(''), payload)
		return createdLibrary
	}

	thumbnailURL(id: string): string {
		return libraryURL(`/${id}/thumbnail`)
	}

	// TODO: type image response
	async updateThumbnail(id: string, payload: PatchLibraryThumbnail) {
		return this.api.axios.patch(this.thumbnailURL(id), payload)
	}

	// TODO: type image response
	async uploadThumbnail(id: string, file: File) {
		const formData = new FormData()
		formData.append('file', file)
		return this.api.axios.post(this.thumbnailURL(id), formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	}

	// TODO: support all vs just library thumb
	async deleteThumbnails(id: string): Promise<void> {
		await this.api.axios.delete(this.thumbnailURL(id))
	}

	async generateThumbnails(id: string, payload: GenerateLibraryThumbnails): Promise<void> {
		await this.api.axios.post(`/${this.thumbnailURL(id)}/generate`, payload)
	}

	async getStats({ id, ...params }: LibraryStatsParams & { id?: string }): Promise<LibraryStats> {
		const { data: stats } = await this.api.axios.get<LibraryStats>(
			libraryURL(id ? `/${id}/stats` : '/stats', params),
		)
		return stats
	}

	async excludedUsers(id: string): Promise<User[]> {
		const { data: excludedUsers } = await this.api.axios.get<User[]>(
			libraryURL(`/${id}/excluded-users`),
		)
		return excludedUsers
	}

	async updateExcludedUsers(id: string, payload: UpdateLibraryExcludedUsers): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.post<Library>(
			libraryURL(`/${id}/excluded-users`),
			payload,
		)
		return updatedLibrary
	}

	async update(id: string, payload: UpdateLibrary): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.post(libraryURL(id), payload)
		return updatedLibrary
	}

	async visit(id: string): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.put<Library>(
			libraryURL(`/last-visited/${id}`),
		)
		return updatedLibrary
	}

	async scan(id: string): Promise<void> {
		await this.api.axios.post(libraryURL(`/${id}/scan`))
	}

	async clean(id: string): Promise<CleanLibraryResponse> {
		const { data } = await this.api.axios.post<CleanLibraryResponse>(libraryURL(`/${id}/clean`))
		return data
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
		return {
			analyze: 'library.analyze',
			clean: 'library.clean',
			create: 'library.create',
			delete: 'library.delete',
			deleteThumbnails: 'library.deleteThumbnails',
			excludedUsers: 'library.excludedUsers',
			generateThumbnails: 'library.generateThumbnails',
			get: 'library.get',
			getByID: 'library.getByID',
			getLastVisited: 'library.getLastVisited',
			getStats: 'library.getStats',
			scan: 'library.scan',
			update: 'library.update',
			updateExcludedUsers: 'library.updateExcludedUsers',
			updateThumbnail: 'library.updateThumbnail',
			uploadThumbnail: 'library.uploadThumbnail',
			visit: 'library.visit',
		}
	}
}
