import { AxiosRequestConfig } from 'axios'

import { APIBase } from '../base'
import {
	authDocument,
	feedSchema,
	OPDSAuthenticationDocument,
	OPDSFeed,
	OPDSProgression,
	OPDSProgressionInput,
	OPDSPublication,
	progression,
	publication,
} from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler, resolveUrl, toUrlParams, urlWithParams } from './utils'

type OPDSPageQuery = {
	page: number
	page_size: number
}

/**
 * The root route for the OPDS v2 API
 */
const OPDS_V2_ROUTE = '/opds/v2.0'
/**
 * A helper function to format the URL for OPDS v2 API routes with optional query parameters
 */
export const opdsURL = createRouteURLHandler(OPDS_V2_ROUTE)

/**
 * The OPDS API controller, used for interacting with the OPDS v2 endpoints of the Stump API
 */
export class OPDSV2API extends APIBase {
	get config(): AxiosRequestConfig {
		return {
			baseURL: this.serviceURL.replace(/\/api(\/.+)?$/, ''),
		}
	}

	imageURL(url: string): string {
		return `${this.serviceURL.replace(/\/api(\/.+)?$/, '')}${url}`.replace(/([^:]\/)\/+/g, '$1')
	}

	/**
	 * The authentication document for the OPDS API, representing the auth
	 * flows supported by the server
	 */
	async authDocument(): Promise<OPDSAuthenticationDocument> {
		const { data } = await this.axios.get<OPDSAuthenticationDocument>(opdsURL('/auth'), this.config)
		return authDocument.parse(data)
	}

	/**
	 * The root catalog feed
	 */
	async catalog(): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/catalog'), this.config)
		return feedSchema.parse(data)
	}

	/**
	 * A generic method to fetch an OPDS feed from a URL that may not be from a Stump server
	 */
	async feed(url: string, params?: OPDSPageQuery): Promise<OPDSFeed> {
		const absoluteUrl = resolveUrl(url, this.api.rootURL)
		const resolvedURL = urlWithParams(
			// See https://github.com/ajslater/codex/issues/524 for commented out line
			// `${absoluteUrl.endsWith('/') ? absoluteUrl.slice(0, -1) : absoluteUrl}`,
			absoluteUrl,
			toUrlParams(params),
		)
		const { data } = await this.axios.get<OPDSFeed>(resolvedURL, {
			baseURL: undefined,
		})
		return feedSchema.parse(data)
	}

	async libraries(pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/libraries', pagination), this.config)
		return feedSchema.parse(data)
	}

	async library(libraryID: string): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL(`/libraries/${libraryID}`), this.config)
		return feedSchema.parse(data)
	}

	libraryThumbnailURL(libraryID: string): string {
		return this.imageURL(opdsURL(`/libraries/${libraryID}/thumbnail`))
	}

	async libraryBooks(libraryID: string, pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL(`/libraries/${libraryID}/books`, pagination),
			this.config,
		)
		return feedSchema.parse(data)
	}

	async latestLibraryBooks(libraryID: string, pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL(`/libraries/${libraryID}/books/latest`, pagination),
			this.config,
		)
		return feedSchema.parse(data)
	}

	async series(pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/series', pagination), this.config)
		return feedSchema.parse(data)
	}

	async seriesByID(seriesID: string, pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL(`/series/${seriesID}`, pagination),
			this.config,
		)
		return feedSchema.parse(data)
	}

	seriesThumbnailURL(seriesID: string): string {
		return this.imageURL(opdsURL(`/series/${seriesID}/thumbnail`))
	}

	async books(pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/books', pagination), this.config)
		return feedSchema.parse(data)
	}

	async latestBooks(pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL('/books/latest', pagination),
			this.config,
		)
		return feedSchema.parse(data)
	}

	async keepReading(pagination?: OPDSPageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL('/books/keep-reading', pagination),
			this.config,
		)
		return feedSchema.parse(data)
	}

	async book(bookID: string): Promise<OPDSPublication> {
		const { data } = await this.axios.get<OPDSPublication>(opdsURL(`/books/${bookID}`), this.config)
		return publication.parse(data)
	}

	async bookProgression(bookID: string): Promise<OPDSProgression> {
		const { data } = await this.axios.get(opdsURL(`/books/${bookID}/progression`), this.config)
		return progression.parse(data)
	}

	/**
	 * Update the reading progression for a book, assuming the server supports it
	 *
	 * @param url The progression URL (from the publication's links with rel="http://www.cantook.com/api/progression")
	 * @param data The progression data
	 */
	async updateProgression(url: string, data: OPDSProgressionInput): Promise<void> {
		await this.axios.put(resolveUrl(url, this.api.rootURL), data, {
			baseURL: undefined,
			headers: {
				'Content-Type': 'application/vnd.readium.progression+json',
			},
		})
	}

	async progression(url: string): Promise<OPDSProgression> {
		const { data } = await this.axios.get<OPDSProgression>(resolveUrl(url, this.api.rootURL), {
			baseURL: undefined,
		})
		const result = progression.safeParse(data)
		if (!result.success) {
			console.warn('Failed to parse progression:', result.error)
			throw new Error('Failed to parse progression', result.error)
		}
		return result.data
	}

	/**
	 * A generic method to fetch a publication from a URL that may not be from a Stump server
	 * @param url The URL of the publication to fetch
	 */
	async publication(url: string): Promise<OPDSPublication> {
		const { data } = await this.axios.get<OPDSPublication>(resolveUrl(url, this.api.rootURL), {
			baseURL: undefined,
		})
		return publication.parse(data)
	}

	bookThumbnailURL(bookID: string): string {
		return this.imageURL(opdsURL(`/books/${bookID}/thumbnail`))
	}

	bookPageURL(bookID: string, page: number): string {
		return this.imageURL(opdsURL(`/books/${bookID}/pages/${page}`))
	}

	bookFileURL(bookID: string): string {
		return this.imageURL(opdsURL(`/books/${bookID}/file`))
	}

	/**
	 * The keys for the media API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): Omit<ClassQueryKeys<InstanceType<typeof OPDSV2API>>, 'config'> {
		return {
			authDocument: 'opds.authDocument',
			catalog: 'opds.catalog',
			libraries: 'opds.libraries',
			library: 'opds.library',
			libraryBooks: 'opds.libraryBooks',
			latestLibraryBooks: 'opds.latestLibraryBooks',
			series: 'opds.series',
			seriesByID: 'opds.seriesByID',
			books: 'opds.books',
			latestBooks: 'opds.latestBooks',
			keepReading: 'opds.keepReading',
			book: 'opds.book',
			bookProgression: 'opds.bookProgression',
			updateProgression: 'opds.updateProgression',
			progression: 'opds.progression',
			publication: 'opds.publication',
			feed: 'opds.feed',
		}
	}
}
