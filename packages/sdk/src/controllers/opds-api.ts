import { AxiosRequestConfig } from 'axios'

import { APIBase } from '../base'
import {
	authDocument,
	feedSchema,
	OPDSAuthenticationDocument,
	OPDSFeed,
	OPDSProgression,
	OPDSPublication,
	progression,
	publication,
} from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler, toUrlParams, urlWithParams } from './utils'

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
 * The api-key API controller, used for interacting with the api-key endpoints of the Stump API
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
	 * @param url The full URL of the feed to fetch
	 */
	async feed(url: string, params?: OPDSPageQuery): Promise<OPDSFeed> {
		const resolvedURL = urlWithParams(
			`${url.endsWith('/') ? url.slice(0, -1) : url}`,
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

	async progression(url: string): Promise<OPDSProgression> {
		const { data } = await this.axios.get<OPDSProgression>(url, {
			baseURL: undefined,
		})
		return progression.parse(data)
	}

	/**
	 * A generic method to fetch a publication from a URL that may not be from a Stump server
	 * @param url The full URL of the publication to fetch
	 */
	async publication(url: string): Promise<OPDSPublication> {
		const { data } = await this.axios.get<OPDSPublication>(url, {
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
			progression: 'opds.progression',
			publication: 'opds.publication',
			feed: 'opds.feed',
		}
	}
}
