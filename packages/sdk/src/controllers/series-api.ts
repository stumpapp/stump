import { APIBase } from '../base'
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
	 * Fetch the URL for the thumbnail of a series
	 */
	thumbnailURL(id: string): string {
		return this.withServiceURL(seriesURL(`${id}/thumbnail`))
	}
}
