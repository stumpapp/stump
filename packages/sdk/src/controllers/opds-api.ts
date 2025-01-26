import { APIBase } from '../base'
import {
	authDocument,
	feedSchema,
	OPDSAuthenticationDocument,
	OPDSFeed,
	OPDSPublication,
	PageQuery,
	publication,
} from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the OPDS v2 API
 */
const OPDS_V2_ROUTE = '/opds/v2.0'
/**
 * A helper function to format the URL for OPDS v2 API routes with optional query parameters
 */
const opdsURL = createRouteURLHandler(OPDS_V2_ROUTE)

/**
 * The api-key API controller, used for interacting with the api-key endpoints of the Stump API
 */
export class OPDSV2API extends APIBase {
	/**
	 * The authentication document for the OPDS API, representing the auth
	 * flows supported by the server
	 */
	async authDocument(): Promise<OPDSAuthenticationDocument> {
		const { data } = await this.axios.get<OPDSAuthenticationDocument>(opdsURL('/auth'))
		return authDocument.parse(data)
	}

	/**
	 * The root catalog feed
	 */
	async catalog(): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/catalog'), {
			baseURL: this.serviceURL.replace(/\/api(\/.+)?$/, ''),
		})
		return feedSchema.parse(data)
	}

	/**
	 * A generic method to fetch an OPDS feed from a URL that may not be from a Stump server
	 * @param url The full URL of the feed to fetch
	 */
	async feed(url: string): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(url, {
			baseURL: undefined,
		})
		return feedSchema.parse(data)
	}

	async libraries(pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/libraries', pagination), {
			baseURL: this.serviceURL.replace(/\/api(\/.+)?$/, ''),
		})
		return feedSchema.parse(data)
	}

	async library(libraryID: string): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL(`/libraries/${libraryID}`))
		return feedSchema.parse(data)
	}

	libraryThumbnailURL(libraryID: string): string {
		return this.withServiceURL(opdsURL(`/libraries/${libraryID}/thumbnail`))
	}

	async libraryBooks(libraryID: string, pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL(`/libraries/${libraryID}/books`, pagination),
		)
		return feedSchema.parse(data)
	}

	async latestLibraryBooks(libraryID: string, pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(
			opdsURL(`/libraries/${libraryID}/books/latest`, pagination),
		)
		return feedSchema.parse(data)
	}

	async series(pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/series', pagination))
		return feedSchema.parse(data)
	}

	async seriesByID(seriesID: string, pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL(`/series/${seriesID}`, pagination))
		return feedSchema.parse(data)
	}

	seriesThumbnailURL(seriesID: string): string {
		return this.withServiceURL(opdsURL(`/series/${seriesID}/thumbnail`))
	}

	async books(pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/books', pagination))
		return feedSchema.parse(data)
	}

	async latestBooks(pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/books/latest', pagination))
		return feedSchema.parse(data)
	}

	async keepReading(pagination?: PageQuery): Promise<OPDSFeed> {
		const { data } = await this.axios.get<OPDSFeed>(opdsURL('/books/keep-reading', pagination))
		return feedSchema.parse(data)
	}

	async book(bookID: string): Promise<OPDSPublication> {
		const { data } = await this.axios.get<OPDSPublication>(opdsURL(`/books/${bookID}`))
		return publication.parse(data)
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
		return this.withServiceURL(opdsURL(`/books/${bookID}/thumbnail`))
	}

	bookPageURL(bookID: string, page: number): string {
		return this.withServiceURL(opdsURL(`/books/${bookID}/pages/${page}`))
	}

	bookFileURL(bookID: string): string {
		return this.withServiceURL(opdsURL(`/books/${bookID}/file`))
	}

	/**
	 * The keys for the media API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof OPDSV2API>> {
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
			publication: 'opds.publication',
			feed: 'opds.feed',
		}
	}
}
