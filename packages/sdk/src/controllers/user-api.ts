import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the user API
 */
const USER_ROUTE = '/users'
/**
 * A helper function to format the URL for user API routes with optional query parameters
 */
const userURL = createRouteURLHandler(USER_ROUTE)

/**
 * The user API controller, used for interacting with the user endpoints of the Stump API
 */
export class UserAPI extends APIBase {}
