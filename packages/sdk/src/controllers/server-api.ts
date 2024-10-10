import { ClaimResponse, StumpVersion, UpdateCheck } from '../types'

import { APIBase } from '../base'
import { APIResult, ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the server API
 */
const SERVER_ROUTE = '/'
/**
 * A helper function to format the URL for server API routes with optional query parameters
 */
const serverURL = createRouteURLHandler(SERVER_ROUTE)

/**
 * The server API controller, used for interacting with the server endpoints of the Stump API
 */
export class ServerAPI extends APIBase {
	/**
	 * Get the version of the Stump instance
	 */
	async version(): Promise<StumpVersion> {
		const { data: version } = await this.axios.get<StumpVersion>(serverURL('version'))
		return version
	}

	/**
	 * Check for updates to the Stump instance
	 */
	async checkUpdate(): Promise<UpdateCheck> {
		const { data: update } = await this.axios.get<UpdateCheck>(serverURL('update'))
		return update
	}

	/**
	 * Ping the Stump service to check if it is available
	 */
	async ping(): Promise<APIResult<string>> {
		return this.axios.get('/ping')
	}

	/**
	 * Check if the Stump instance has been claimed (at least one user who is the owner)
	 */
	async claimedStatus(): Promise<APIResult<ClaimResponse>> {
		return this.axios.get('/claim')
	}

	get keys(): ClassQueryKeys<InstanceType<typeof ServerAPI>> {
		return {
			checkUpdate: 'server.checkUpdate',
			claimedStatus: 'server.claimedStatus',
			ping: 'server.ping',
			version: 'server.version',
		}
	}
}
