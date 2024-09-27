import {
	CleanLibraryResponse,
	CreateLibrary,
	GenerateLibraryThumbnails,
	Library,
	LibraryFilter,
	LibraryStats,
	LibraryStatsParams,
	Pageable,
	PaginationQuery,
	PatchLibraryThumbnail,
	UpdateLibrary,
	UpdateLibraryExcludedUsers,
	User,
} from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the library API
 */
const LIBRARY_ROUTE = '/libraries'
/**
 * A helper function to format the URL for library API routes with optional query parameters
 */
const libraryURL = createRouteURLHandler(LIBRARY_ROUTE)

/**
 * The library API controller, used for interacting with the library endpoints of the Stump API
 */
export class LibraryAPI extends APIBase {
	/**
	 * Fetch all libraries
	 */
	async get(params?: LibraryFilter & PaginationQuery): Promise<Pageable<Library[]>> {
		const { data: libraries } = await this.api.axios.get<Pageable<Library[]>>(
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

	/**
	 * Create a new library
	 */
	async create(payload: CreateLibrary): Promise<Library> {
		const { data: createdLibrary } = await this.api.axios.post<Library>(libraryURL(''), payload)
		return createdLibrary
	}

	/**
	 * Get the URL for fetching a library thumbnail
	 *
	 * @param id The library ID
	 */
	thumbnailURL(id: string): string {
		return libraryURL(`/${id}/thumbnail`)
	}

	// TODO: type image response
	/**
	 * Update the thumbnail for a library, given the library ID. This is different from the @see {LibraryAPI.uploadThumbnail}
	 * which allows for arbitrary image uploads.
	 *
	 * @param id The library ID
	 */
	async updateThumbnail(id: string, payload: PatchLibraryThumbnail) {
		return this.api.axios.patch(this.thumbnailURL(id), payload)
	}

	// TODO: type image response
	/**
	 * Upload an image as a thumbnail for a library
	 *
	 * @param id The library ID
	 * @param file The file to upload
	 */
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
	/**
	 *Delete all thumbnails for a library
	 *
	 * @param id The library ID
	 */
	async deleteThumbnails(id: string): Promise<void> {
		await this.api.axios.delete(this.thumbnailURL(id))
	}

	/**
	 * Initiate a thumbnail generation job for the given library
	 *
	 * @param id The library ID
	 * @param payload The options for generating thumbnails
	 */
	async generateThumbnails(id: string, payload: GenerateLibraryThumbnails): Promise<void> {
		await this.api.axios.post(`/${this.thumbnailURL(id)}/generate`, payload)
	}

	/**
	 * Fetch the stats for either a specific library or all libraries if no ID is provided
	 */
	async getStats({
		id,
		...params
	}: LibraryStatsParams & { id?: string } = {}): Promise<LibraryStats> {
		const { data: stats } = await this.api.axios.get<LibraryStats>(
			libraryURL(id ? `/${id}/stats` : '/stats', params),
		)
		return stats
	}

	/**
	 * Get the list of users excluded from having access to a library. This is not inclusive of users who lack access
	 * due to tag-based or age-based restrictions.
	 *
	 * @param id The library ID
	 */
	async excludedUsers(id: string): Promise<User[]> {
		const { data: excludedUsers } = await this.api.axios.get<User[]>(
			libraryURL(`/${id}/excluded-users`),
		)
		return excludedUsers
	}

	/**
	 * Update the list of users excluded from having access to a library. This is a full replacement operation, so
	 * the list of users provided will replace the existing list.
	 */
	async updateExcludedUsers(id: string, payload: UpdateLibraryExcludedUsers): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.post<Library>(
			libraryURL(`/${id}/excluded-users`),
			payload,
		)
		return updatedLibrary
	}

	/**
	 * Update a library by ID. This is not a patch
	 */
	async update(id: string, payload: UpdateLibrary): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.post(libraryURL(id), payload)
		return updatedLibrary
	}

	/**
	 * Update the timestamp for the last time a library was visited by the current user
	 */
	async visit(id: string): Promise<Library> {
		const { data: updatedLibrary } = await this.api.axios.put<Library>(
			libraryURL(`/last-visited/${id}`),
		)
		return updatedLibrary
	}

	/**
	 * Initiate a scan of a library
	 */
	async scan(id: string): Promise<void> {
		await this.api.axios.post(libraryURL(`/${id}/scan`))
	}

	/**
	 * Remove all missing series and media from a library
	 */
	async clean(id: string): Promise<CleanLibraryResponse> {
		const { data } = await this.api.axios.post<CleanLibraryResponse>(libraryURL(`/${id}/clean`))
		return data
	}

	/**
	 * Get the library which was last visited by the current user, if any
	 */
	async getLastVisited(): Promise<Library | undefined> {
		const { data: library } = await this.api.axios.get(libraryURL('/last-visited'))
		return library
	}

	/**
	 * Delete a library by ID
	 */
	async delete(id: string): Promise<Library> {
		const { data: deleteLibrary } = await this.api.axios.delete(libraryURL(id))
		return deleteLibrary
	}

	/**
	 * Initiate an analysis of a library
	 */
	async analyze(id: string): Promise<void> {
		await this.api.axios.get(libraryURL(`/${id}/analyze`))
	}

	/**
	 * The query keys for the library API, used for query caching on a client (e.g. react-query)
	 */
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
