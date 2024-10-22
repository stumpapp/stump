import { APIBase } from '../base'
import { APIKey, CreateOrUpdateAPIKey } from '../types'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

/**
 * The root route for the api-key API
 */
const API_KEY_PATH = '/api-keys'
/**
 * A helper function to format the URL for api-key API routes with optional query parameters
 */
const apiKeyURL = createRouteURLHandler(API_KEY_PATH)

/**
 * The api-key API controller, used for interacting with the api-key endpoints of the Stump API
 */
export class APIKeyAPI extends APIBase {
	/**
	 * Fetch a list of all API keys for the current user
	 */
	async get(): Promise<APIKey[]> {
		const { data: keys } = await this.api.axios.get<APIKey[]>(apiKeyURL(''))
		return keys
	}

	/**
	 * Validate a given API key
	 */
	async validateKey(pek: string): Promise<boolean> {
		const { data: valid } = await this.api.axios.post<boolean>(apiKeyURL('/validate'), undefined, {
			headers: {
				'x-api-key': pek,
			},
		})
		return valid
	}

	async getByID(id: number): Promise<APIKey> {
		const { data: key } = await this.api.axios.get<APIKey>(apiKeyURL(`/${id}`))
		return key
	}

	/**
	 * Create a new API key
	 */
	async create(payload: CreateOrUpdateAPIKey): Promise<APIKey> {
		const { data: key } = await this.api.axios.post<APIKey>(apiKeyURL(''), payload)
		return key
	}

	/**
	 * Update an existing API key
	 */
	async update(id: number, payload: CreateOrUpdateAPIKey): Promise<APIKey> {
		const { data: key } = await this.api.axios.put<APIKey>(apiKeyURL(`/${id}`), payload)
		return key
	}

	/**
	 * Delete an existing API key
	 */
	async delete(id: number): Promise<void> {
		await this.api.axios.delete(apiKeyURL(`/${id}`))
	}

	/**
	 * The query keys for the api-key API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof APIKeyAPI>> {
		return {
			get: 'api-key.get',
			validateKey: 'api-key.validateKey',
			getByID: 'api-key.getByID',
			create: 'api-key.create',
			update: 'api-key.update',
			delete: 'api-key.delete',
		}
	}
}
