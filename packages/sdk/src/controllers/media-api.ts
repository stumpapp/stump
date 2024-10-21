import { APIBase } from '../base'
import {
	Media,
	MediaFilter,
	Pageable,
	PatchMediaThumbnail,
	ProgressUpdateReturn,
	PutMediaCompletionStatus,
} from '../types'
import { ClassQueryKeys, CursorQueryParams, FullQueryParams } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the media API
 */
const MEDIA_ROUTE = '/media'
/**
 * A helper function to format the URL for media API routes with optional query parameters
 */
const mediaURL = createRouteURLHandler(MEDIA_ROUTE)

/**
 * The media API controller, used for interacting with the media endpoints of the Stump API
 */
export class MediaAPI extends APIBase {
	/**
	 * Fetch all media
	 */
	async get(params?: FullQueryParams<MediaFilter>): Promise<Pageable<Media[]>> {
		const { data: media } = await this.axios.get<Pageable<Media[]>>(mediaURL('', params))
		return media
	}

	/**
	 * Fetch media and maintain a cursor
	 */
	async getCursor(params: CursorQueryParams): Promise<Pageable<Media[]>> {
		const { data: media } = await this.axios.get<Pageable<Media[]>>(mediaURL('', params))
		return media
	}

	/**
	 * Fetch media by ID
	 */
	async getByID(id: string, params?: MediaFilter): Promise<Media> {
		const { data: media } = await this.axios.get<Media>(mediaURL(id, params))
		return media
	}

	/**
	 * Fetch media by its path
	 */
	async getByPath(path: string): Promise<Media> {
		const { data: media } = await this.axios.get<Media>(
			mediaURL(`path/${encodeURIComponent(path)}`),
		)
		return media
	}

	/**
	 * Fetch recently added media
	 */
	async recentlyAdded(params: CursorQueryParams): Promise<Pageable<Media[]>> {
		const { data: media } = await this.axios.get<Pageable<Media[]>>(
			mediaURL('recently-added', params),
		)
		return media
	}

	/**
	 * Fetch media which are in progress (by the currently authenticated user)
	 */
	async inProgress(params: CursorQueryParams): Promise<Pageable<Media[]>> {
		const { data: media } = await this.axios.get<Pageable<Media[]>>(
			mediaURL('keep-reading', params),
		)
		return media
	}

	/**
	 * The URL for fetching the thumbnail of a media entity
	 */
	thumbnailURL(id: string): string {
		return this.withServiceURL(mediaURL(`/${id}/thumbnail`))
	}

	/**
	 * The URL for fetching the file of a media entity
	 */
	downloadURL(id: string): string {
		return this.withServiceURL(mediaURL(`/${id}/file`))
	}

	/**
	 * The URL for fetching a page of a media entity
	 */
	bookPageURL(mediaID: string, page: number): string {
		return this.withServiceURL(mediaURL(`${mediaID}/page/${page}`))
	}

	/**
	 * Update the progress of a media entity
	 */
	async updateProgress(mediaID: string, page: number): Promise<ProgressUpdateReturn> {
		const { data } = await this.axios.put(mediaURL(`${mediaID}/progress/${page}`))
		return data
	}

	/**
	 * Update the thumbnail of a media entity
	 */
	async patchThumbnail(id: string, payload: PatchMediaThumbnail): Promise<void> {
		await this.axios.patch(mediaURL(`${id}/thumbnail`), payload)
	}

	/**
	 * Upload a thumbnail for a media entity
	 */
	async uploadThumbnail(id: string, file: File): Promise<void> {
		const formData = new FormData()
		formData.append('file', file)
		await this.axios.post(mediaURL(`${id}/thumbnail`), formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	}

	/**
	 * Mark a media entity as complete
	 */
	async complete(id: string, payload: PutMediaCompletionStatus): Promise<void> {
		await this.axios.put(mediaURL(`${id}/progress/complete`), payload)
	}

	/**
	 * Delete the active reading session for a media entity
	 */
	async deleteActiveReadingSession(id: string): Promise<void> {
		await this.axios.delete(mediaURL(`${id}/progress`))
	}

	/**
	 * Start the analysis of a media entity
	 */
	async analyze(id: string): Promise<void> {
		await this.axios.post(mediaURL(`${id}/analyze`))
	}

	/**
	 * The keys for the media API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof MediaAPI>> {
		return {
			analyze: 'media.analyze',
			complete: 'media.complete',
			deleteActiveReadingSession: 'media.deleteActiveReadingSession',
			get: 'media.get',
			getByID: 'media.getByID',
			getByPath: 'media.getByPath',
			getCursor: 'media.getCursor',
			inProgress: 'media.inProgress',
			patchThumbnail: 'media.patchThumbnail',
			recentlyAdded: 'media.recentlyAdded',
			updateProgress: 'media.updateProgress',
			uploadThumbnail: 'media.uploadThumbnail',
		}
	}
}
