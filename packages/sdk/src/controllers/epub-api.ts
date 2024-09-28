import { Bookmark, CreateOrUpdateBookmark, Epub, UpdateEpubProgress } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the epub API
 */
const EPUB_ROUTE = '/epub'
/**
 * A helper function to format the URL for epub API routes with optional query parameters
 */
const epubURL = createRouteURLHandler(EPUB_ROUTE)

/**
 * The epub API controller, used for interacting with the epub endpoints of the Stump API
 */
export class EpubAPI extends APIBase {
	/**
	 * A helper to get the service URL for the epub API scoped to a specific epub ID
	 */
	epubServiceURL(id: string): string {
		return epubURL(`/${id}`)
	}

	/**
	 * Fetch an epub by its ID
	 */
	async getByID(id: string): Promise<Epub> {
		const { data: epub } = await this.api.axios.get<Epub>(epubURL(id))
		return epub
	}

	/**
	 * Fetch a resource from an epub by its ID and resource ID
	 */
	async fetchResource({
		id,
		root = 'META-INF',
		resourceId,
	}: {
		id: string
		root?: string
		resourceId: string
	}): Promise<string> {
		const { data: resource } = await this.api.axios.get<string>(
			epubURL(`${id}/${root}/${resourceId}`),
		)
		return resource
	}

	async updateProgress({ id, ...payload }: UpdateEpubProgress & { id: string }) {
		const { data: updatedProgress } = await this.api.axios.put<UpdateEpubProgress>(
			epubURL(`${id}/progress`),
			payload,
		)
		return updatedProgress
	}

	/**
	 * Fetch all bookmarks for an epub by its ID
	 */
	async getBookmarks(id: string): Promise<Bookmark[]> {
		const { data: bookmarks } = await this.api.axios.get<Bookmark[]>(epubURL(`${id}/bookmarks`))
		return bookmarks
	}

	/**
	 * Create a new bookmark for an epub by its ID
	 */
	async createBookmark(id: string, payload: CreateOrUpdateBookmark): Promise<Bookmark> {
		const { data: createdBookmark } = await this.api.axios.post<Bookmark>(
			epubURL(`${id}/bookmarks`),
			payload,
		)
		return createdBookmark
	}

	/**
	 * Update a bookmark for an epub by its ID and bookmark ID
	 */
	async updateBookmark(
		id: string,
		bookmarkID: string,
		payload: CreateOrUpdateBookmark,
	): Promise<Bookmark> {
		const { data: updatedBookmark } = await this.api.axios.put<Bookmark>(
			epubURL(`${id}/bookmarks/${bookmarkID}`),
			payload,
		)
		return updatedBookmark
	}

	/**
	 * Delete a bookmark for an epub by its ID and bookmark ID
	 */
	async deleteBookmark(id: string, bookmarkID: string): Promise<void> {
		await this.api.axios.delete(epubURL(`${id}/bookmarks/${bookmarkID}`))
	}

	/**
	 * The query keys for the epub API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof EpubAPI>> {
		return {
			createBookmark: 'epub.createBookmark',
			deleteBookmark: 'epub.deleteBookmark',
			epubServiceURL: 'epub.serviceURL',
			fetchResource: 'epub.fetchResource',
			getBookmarks: 'epub.getBookmarks',
			getByID: 'epub.getByID',
			updateBookmark: 'epub.updateBookmark',
			updateProgress: 'epub.updateProgress',
		}
	}
}
