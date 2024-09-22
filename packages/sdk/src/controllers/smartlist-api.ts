import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the smartlist API
 */
const SMARTLIST_ROUTE = '/smart-lists'
/**
 * A helper function to format the URL for smartlist API routes with optional query parameters
 */
const smartListURL = createRouteURLHandler(SMARTLIST_ROUTE)

/**
 * The smartlist API controller, used for interacting with the smartlist endpoints of the Stump API
 */
export class SmartListAPI extends APIBase {}
