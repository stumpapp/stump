import { z } from 'zod'

import { APIBase } from '../base'
import { PageQuery } from '../types'
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
		}
	}
}

export type OPDSLinkType = string

const baseLink = z.object({
	title: z.string().optional(),
	rel: z.union([z.string(), z.array(z.string())]).optional(),
	href: z.string(),
	type: z.string().optional(),
	templated: z.boolean().optional(),
	properties: z.record(z.unknown()).optional(),
})
export type OPDSBaseLink = z.infer<typeof baseLink>

const navigationLink = z
	.object({
		title: z.string(),
	})
	.and(baseLink)
export type OPDSNavigationLink = z.infer<typeof navigationLink>

const imageLink = z
	.object({
		width: z.number().optional(),
		height: z.number().optional(),
	})
	.and(baseLink)

const link = z.union([baseLink, navigationLink, imageLink])
export type OPDSLink = z.infer<typeof link>

const authFlow = z.object({
	type: z.literal('http://opds-spec.org/auth/basic'),
})

// OPDSAuthenticationDocument
const authDocument = z.object({
	id: z.string(),
	authentication: z.array(authFlow),
	title: z.string(),
	description: z.string().optional(),
	links: z.array(link).default([]),
})
export type OPDSAuthenticationDocument = z.infer<typeof authDocument>

const paginationMeta = z.object({
	numberOfItems: z.number().optional(),
	itemsPerPage: z.number().optional(),
	currentPage: z.number().optional(),
})
export type OPDSPaginationMetadata = z.infer<typeof paginationMeta>

const belongsTo = z.object({
	series: z
		.object({
			name: z.string(),
			position: z.number().optional(),
			links: z.array(link).default([]),
		})
		.optional(),
})
export type OPDSEntryBelongsTo = z.infer<typeof belongsTo>

export type OPDSDynamicMetadata = Record<string, unknown>
const metadata = z
	.object({
		title: z.string(),
		modified: z.string().optional(),
		description: z.string().optional(),
		belongsTo: belongsTo.optional(),
	})
	.merge(paginationMeta)
// .merge(z.record(z.unknown()))
export type OPDSMetadata = z.infer<typeof metadata>

const publication = z.object({
	context: z.string(),
	metadata: metadata,
	links: z.array(link).optional(),
	images: z.array(imageLink).optional(),
	readingOrder: z.array(link).optional(),
	resources: z.array(link).optional(),
	toc: z.array(link).optional(),
	landmarks: z.array(link).optional(),
	pageList: z.array(link).optional(),
})
export type OPDSPublication = z.infer<typeof publication>

const feedGroup = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	publications: z.array(publication).default([]),
	metadata,
})
export type OPDSFeedGroup = z.infer<typeof feedGroup>

const feedSchema = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	groups: z.array(feedGroup).default([]),
	publications: z.array(publication).default([]),
	metadata,
})
export type OPDSFeed = z.infer<typeof feedSchema>
