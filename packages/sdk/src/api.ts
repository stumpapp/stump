import axios, { AxiosInstance } from 'axios'

import { AuthenticationMethod, Configuration } from './configuration'
import { formatApiURL } from './utils'

export type ApiVersion = 'v1'

/**
 * A class representing the Stump API
 */
export class Api {
	private baseURL: string
	private configuration: Configuration
	private axiosInstance: AxiosInstance

	private accessToken?: string

	/**
	 * Create a new instance of the API
	 * @param baseURL The base URL to the Stump server
	 */
	constructor(baseURL: string, authenticationMethod: AuthenticationMethod = 'session') {
		this.baseURL = baseURL
		this.configuration = new Configuration(authenticationMethod)
		this.axiosInstance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authenticationMethod === 'session',
		})
	}

	/**
	 * Get a new access token for the API
	 * @param username The username to authenticate with
	 * @param password The password to authenticate with
	 * @returns A promise that resolves when the token is received
	 * @throws An error if the token cannot be received
	 */
	async token(username: string, password: string): Promise<void> {
		const response = await this.axiosInstance.post('/token', {
			password,
			username,
		})

		this.accessToken = response.data.accessToken
	}

	/**
	 * Get the URL of the Stump service
	 */
	get serviceURL(): string {
		return formatApiURL(this.baseURL, this.configuration.apiVersion)
	}

	/**
	 * Get the current access token for the API formatted as a Bearer token
	 */
	get authorizationHeader(): string | undefined {
		return this.accessToken ? `Bearer ${this.accessToken}` : undefined
	}
}
