import { APIBase } from '../base'
import type { EpubSearchParams, EpubSearchResponse } from '../types/epub'
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
		return this.withServiceURL(epubURL(`/${id}`))
	}

	/**
	 * Absolute URL for the Readium Web Publication Manifest for an epub
	 */
	manifestURL(id: string): string {
		return this.withServiceURL(epubURL(`/${id}/manifest.json`))
	}

	/**
	 * Absolute URL for the Readium positions list for an epub
	 */
	positionsURL(id: string): string {
		return this.withServiceURL(epubURL(`/${id}/positions.json`))
	}

	/**
	 * Absolute URL for whole-book EPUB search
	 */
	searchURL(id: string): string {
		return this.withServiceURL(epubURL(`/${id}/search`))
	}

	/**
	 * Bounded whole-book search over spine XHTML. Returns Readium locators — never
	 * downloads the EPUB archive.
	 */
	async search({ id, q, limit, cursor, signal }: EpubSearchParams): Promise<EpubSearchResponse> {
		const { data } = await this.api.axios.get<EpubSearchResponse>(
			epubURL(`/${id}/search`, {
				q,
				...(limit != null ? { limit } : {}),
				...(cursor ? { cursor } : {}),
			}),
			{ signal },
		)
		return data
	}

	/**
	 * The query keys for the epub API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof EpubAPI>> {
		return {
			search: 'epub.search',
		}
	}
}
