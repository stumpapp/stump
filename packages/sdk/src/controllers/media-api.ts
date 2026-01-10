import { ScaledDimensionResizeInput } from '@stump/graphql'

import { APIBase } from '../base'
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
	bookPageURL(mediaID: string, page: number, params?: ScaledDimensionResizeInput): string {
		return this.withServiceURL(mediaURL(`${mediaID}/page/${page}`, params))
	}
}
