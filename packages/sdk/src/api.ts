import axios, { AxiosInstance } from 'axios'

import { AuthenticationMethod, Configuration } from './configuration'
import { AuthAPI, LibraryAPI } from './controllers'
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

	get isTokenAuth(): boolean {
		return this.configuration.authenticationMethod === 'token'
	}

	get axios(): AxiosInstance {
		return this.axiosInstance
	}

	get token(): string | undefined {
		return this.accessToken
	}

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

	get library(): LibraryAPI {
		return new LibraryAPI(this)
	}
}

/*
const [api] = useSDK()
const {data} = useQuery([api.library.keys.get, {unpaged: true}], () => api.library.get())
*/
