import { APIBase } from '../base'
import {
	Media,
	Pageable,
	PatchSeriesThumbnail,
	Series,
	SeriesFilter,
	SeriesOrderBy,
} from '../types'
import { MediaAPI } from './media-api'
import { ClassQueryKeys, CursorQueryParams, FullQueryParams, PagedQueryParams } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the series API
 */
const SERIES_ROUTE = '/series'
/**
 * A helper function to format the URL for series API routes with optional query parameters
 */
const seriesURL = createRouteURLHandler(SERIES_ROUTE)

/**
 * The series API controller, used for interacting with the series endpoints of the Stump API
 */
export class SeriesAPI extends APIBase {
	/**
	 * Fetch all series
	 */
	async get(params?: FullQueryParams<SeriesFilter, SeriesOrderBy>): Promise<Pageable<Series[]>> {
		const { data: series } = await this.axios.get<Pageable<Series[]>>(seriesURL('', params))
		return series
	}

	/**
	 * Fetch series and maintain a cursor
	 */
	async getCursor(params: CursorQueryParams): Promise<Pageable<Series[]>> {
		const { data: series } = await this.axios.get<Pageable<Series[]>>(seriesURL('', params))
		return series
	}

	/**
	 * Fetch series by ID
	 */
	async getByID(id: string, params?: SeriesFilter): Promise<Series> {
		const { data: series } = await this.axios.get<Series>(seriesURL(id, params))
		return series
	}

	/**
	 * Fetch media for a series
	 */
	async getSeriesMedia(
		id: string,
		{ page, page_size, ...params }: PagedQueryParams,
	): Promise<Pageable<Media[]>> {
		const { data: media } = await this.axios.get<Pageable<Media[]>>(
			seriesURL(`${id}/media`, {
				...params,
				page,
				page_size,
			}),
		)
		return media
	}

	/**
	 * Fetch recently added series
	 */
	async recentlyAdded({ page, page_size, ...params }: PagedQueryParams) {
		const { data: series } = await this.axios.get<Pageable<Series[]>>(
			seriesURL('recently-added', {
				...params,
				page,
				page_size,
			}),
		)
		return series
	}

	/**
	 * Fetch the next book in the series, according to the user's progress
	 */
	async nextBook(forSeries: string): Promise<Media | undefined> {
		const { data: upNextBook } = await this.axios.get<Media | undefined>(
			seriesURL(`${forSeries}/media/next`),
		)
		return upNextBook
	}

	/**
	 * Fetch a list of books within a series which are approximately ordered after the cursor.
	 */
	async nextBooks(
		forSeries: string,
		{ cursor, limit = 25, params }: CursorQueryParams,
	): Promise<Pageable<Media[]>> {
		const bookAPI = new MediaAPI(this.api)
		return bookAPI.getCursor({
			cursor,
			limit,
			params: {
				...params,
				series_id: forSeries,
			},
		})
	}

	/**
	 * Fetch the URL for the thumbnail of a series
	 */
	thumbnailURL(id: string): string {
		return this.withServiceURL(seriesURL(`${id}/thumbnail`))
	}

	/**
	 * Patch the thumbnail of a series
	 */
	async patchThumbnail(id: string, payload: PatchSeriesThumbnail): Promise<void> {
		this.axios.patch(this.thumbnailURL(id), payload)
	}

	/**
	 * Upload a new thumbnail for a series
	 */
	async uploadThumbnail(id: string, file: File): Promise<void> {
		const formData = new FormData()
		formData.append('file', file)
		return this.axios.post(this.thumbnailURL(id), formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		})
	}

	/**
	 * Start the analysis of a series
	 */
	async analyze(id: string): Promise<void> {
		await this.axios.post(seriesURL(`${id}/analyze`))
	}

	/**
	 * The keys for the series API
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof SeriesAPI>> {
		return {
			analyze: 'series.analyze',
			get: 'series.get',
			getByID: 'series.getByID',
			getCursor: 'series.getCursor',
			getSeriesMedia: 'series.getSeriesMedia',
			nextBook: 'series.nextBook',
			nextBooks: 'series.nextBooks',
			patchThumbnail: 'series.patchThumbnail',
			recentlyAdded: 'series.recentlyAdded',
			uploadThumbnail: 'series.uploadThumbnail',
		}
	}
}
