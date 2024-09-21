import { ClaimResponse } from '@stump/types'
import axios, { AxiosInstance } from 'axios'

import { AuthenticationMethod, Configuration } from './configuration'
import { AuthAPI, BookClubAPI, EmailerAPI, EpubAPI, LibraryAPI } from './controllers'
import { APIResult } from './controllers/types'
import { formatApiURL } from './utils'

export type ApiVersion = 'v1'

/**
 * A class representing the Stump API
 */
export class Api {
	/**
	 * The raw base URL for the API. This will be used to construct the service URL, and
	 * may not be a fully valid API URL on its own.
	 */
	private baseURL: string
	/**
	 * The configuration for the API, including the authentication method and API version
	 */
	private configuration: Configuration
	/**
	 * The Axios instance used to make requests to the API
	 */
	private axiosInstance: AxiosInstance
	/**
	 * The current access token for the API, if any
	 */
	private accessToken?: string

	/**
	 * Create a new instance of the API
	 * @param baseURL The base URL to the Stump server
	 */
	constructor(baseURL: string, authenticationMethod: AuthenticationMethod = 'session') {
		this.baseURL = baseURL
		this.configuration = new Configuration(authenticationMethod)

		const instance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authenticationMethod === 'session',
		})
		instance.interceptors.request.use((config) => {
			if (this.authorizationHeader) {
				config.headers.Authorization = this.authorizationHeader
			}
			return config
		})
		this.axiosInstance = instance
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

	/**
	 * Check if the current authentication method is token-based
	 */
	get isTokenAuth(): boolean {
		return this.configuration.authenticationMethod === 'token'
	}

	/**
	 * A getter for the Axios instance
	 */
	get axios(): AxiosInstance {
		return this.axiosInstance
	}

	/**
	 * Get the current access token for the API, if any
	 */
	get token(): string | undefined {
		return this.accessToken
	}

	/**
	 * Set the current access token for the API
	 */
	set token(token: string) {
		this.accessToken = token
	}

	/**
	 * Get the URL of the Stump service
	 */
	get serviceURL(): string {
		return formatApiURL(this.baseURL, this.configuration.apiVersion)
	}
	/**
	 * Set the URL of the Stump service
	 */
	set serviceURL(url: string) {
		this.baseURL = url
		this.axiosInstance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authenticationMethod === 'session',
		})
	}

	/**
	 * Get the current access token for the API formatted as a Bearer token
	 */
	get authorizationHeader(): string | undefined {
		return this.accessToken ? `Bearer ${this.accessToken}` : undefined
	}

	/**
	 * Get an instance for the AuthAPI
	 */
	get auth(): AuthAPI {
		return new AuthAPI(this)
	}

	/**
	 * Get an instance for the BookClubAPI
	 */
	get club(): BookClubAPI {
		return new BookClubAPI(this)
	}

	/**
	 * Get an instance for the EmailerAPI
	 */
	get emailer(): EmailerAPI {
		return new EmailerAPI(this)
	}

	/**
	 * Get an instance for the EpubAPI
	 */
	get epub(): EpubAPI {
		return new EpubAPI(this)
	}

	/**
	 * Get an instance for the LibraryAPI
	 */
	get library(): LibraryAPI {
		return new LibraryAPI(this)
	}
}

/*
const [api] = useSDK()
const {data} = useQuery([api.library.keys.get, {unpaged: true}], () => api.library.get())
*/
