import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the tag API
 */
const TAG_ROUTE = '/tags'
/**
 * A helper function to format the URL for tags API routes with optional query parameters
 */
const tagURL = createRouteURLHandler(TAG_ROUTE)

/**
 * The smartlist API controller, used for interacting with the smartlist endpoints of the Stump API
 */
export class TagAPI extends APIBase {}
