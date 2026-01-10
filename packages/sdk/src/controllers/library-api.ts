import { APIBase } from '../base'
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
	 * Get the URL for fetching a library thumbnail
	 *
	 * @param id The library ID
	 */
	thumbnailURL(id: string): string {
		return this.withServiceURL(libraryURL(`/${id}/thumbnail`))
	}
}
