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

	// TODO(graphql): I think we need to port this to v2
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

	/**
	 * The query keys for the epub API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof EpubAPI>> {
		return {
			epubServiceURL: 'epub.serviceURL',
			fetchResource: 'epub.fetchResource',
		}
	}
}
