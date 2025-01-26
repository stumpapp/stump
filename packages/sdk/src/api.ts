import axios, { AxiosInstance } from 'axios'

import { AuthenticationMethod, Configuration } from './configuration'
import {
	APIKeyAPI,
	AuthAPI,
	BookClubAPI,
	EmailerAPI,
	EpubAPI,
	FilesystemAPI,
	JobAPI,
	LibraryAPI,
	LogAPI,
	MediaAPI,
	MetadataAPI,
	OPDSV2API,
	SeriesAPI,
	ServerAPI,
	SmartListAPI,
	TagAPI,
	UploadAPI,
	UserAPI,
} from './controllers'
import { formatApiURL } from './utils'

export type ApiVersion = 'v1'

export type ApiParams = {
	baseURL: string
} & (
	| {
			authMethod?: AuthenticationMethod
			apiKey?: never
	  }
	| {
			authMethod: 'api-key'
			apiKey: string
	  }
)

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
	 * The basic auth string for the API, if any. This will be encoded and sent as an
	 * Authorization header, if present.
	 */
	// TODO: encode
	private _basicAuth?: { username: string; password: string }
	/**
	 * Custom headers to be sent with every request
	 */
	private _customHeaders: Record<string, string> = {}

	/**
	 * Create a new instance of the API
	 * @param baseURL The base URL to the Stump server
	 */
	constructor({ baseURL, authMethod = 'session', apiKey }: ApiParams) {
		this.baseURL = baseURL
		this.configuration = new Configuration(authMethod)
		if (apiKey) {
			this.accessToken = apiKey
		}

		const instance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authMethod === 'session',
		})
		instance.interceptors.request.use((config) => {
			config.headers = config.headers.concat(this.headers)
			if (this._basicAuth) {
				config.auth = this._basicAuth
			}
			return config
		})
		this.axiosInstance = instance
	}

	/**
	 * Check if the current authentication method is token-based
	 */
	get isTokenAuth(): boolean {
		return this.configuration.authMethod === 'token'
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
	set token(token: string | undefined) {
		this.accessToken = token
	}

	/**
	 * Set the basic auth string for the API using a username and password
	 */
	set basicAuth({ username, password }: { username: string; password: string }) {
		this._basicAuth = { username, password }
	}

	/**
	 * Get the basic auth string for the API
	 */
	get basicAuthHeader(): string | undefined {
		return this._basicAuth
			? Buffer.from(`${this._basicAuth.username}:${this._basicAuth.password}`).toString('base64')
			: undefined
	}

	/**
	 * Set custom headers to be sent with every request
	 */
	set customHeaders(headers: Record<string, string>) {
		this._customHeaders = headers
	}

	/**
	 * Get the URL of the Stump service
	 */
	get serviceURL(): string {
		return formatApiURL(this.baseURL, this.configuration.apiVersion)
	}

	get config(): Configuration {
		return this.configuration
	}

	/**
	 * Set the URL of the Stump service
	 */
	set serviceURL(url: string) {
		this.baseURL = url
		this.axiosInstance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authMethod === 'session',
		})
	}

	get eventSourceURL(): string {
		return `${this.baseURL.replace(/\/api(\/v\d)?$/, '')}/sse`
	}

	/**
	 * Get the current access token for the API formatted as a Bearer token
	 */
	get authorizationHeader(): string | undefined {
		if (this.accessToken) {
			return `Bearer ${this.accessToken}`
		} else if (this.basicAuthHeader) {
			return `Basic ${this.basicAuthHeader}`
		} else {
			return undefined
		}
	}

	/**
	 * Get the headers to be sent with every request
	 */
	get headers(): Record<string, string> {
		return {
			...this._customHeaders,
			...(this.authorizationHeader ? { Authorization: this.authorizationHeader } : {}),
		}
	}

	/**
	 * Get an instance for the AuthAPI
	 */
	get auth(): AuthAPI {
		return new AuthAPI(this)
	}

	/**
	 * Get an instance for the APIKeyAPI
	 */
	get apiKey(): APIKeyAPI {
		return new APIKeyAPI(this)
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
	 * Get an instance for the FilesystemAPI
	 */
	get filesystem(): FilesystemAPI {
		return new FilesystemAPI(this)
	}

	/**
	 * Get an instance for the JobAPI
	 */
	get job(): JobAPI {
		return new JobAPI(this)
	}

	/**
	 * Get an instance for the LibraryAPI
	 */
	get library(): LibraryAPI {
		return new LibraryAPI(this)
	}

	/**
	 * Get an instance for the LogAPI
	 */
	get log(): LogAPI {
		return new LogAPI(this)
	}

	/**
	 * Get an instance for the MediaAPI
	 */
	get media(): MediaAPI {
		return new MediaAPI(this)
	}

	/**
	 * Get an instance for the MetadataAPI
	 */
	get metadata(): MetadataAPI {
		return new MetadataAPI(this)
	}

	get opds(): OPDSV2API {
		return new OPDSV2API(this)
	}

	/**
	 * Get an instance for the SeriesAPI
	 */
	get series(): SeriesAPI {
		return new SeriesAPI(this)
	}

	/**
	 * Get an instance for the ServerAPI
	 */
	get server(): ServerAPI {
		return new ServerAPI(this)
	}

	/**
	 * Get an instance for the SmartListAPI
	 */
	get smartlist(): SmartListAPI {
		return new SmartListAPI(this)
	}

	/**
	 * Get an instance for the TagAPI
	 */
	get tag(): TagAPI {
		return new TagAPI(this)
	}

	get upload(): UploadAPI {
		return new UploadAPI(this)
	}

	/**
	 * Get an instance for the UserAPI
	 */
	get user(): UserAPI {
		return new UserAPI(this)
	}
}

// TODO: look into https://github.com/TanStack/query/issues/3228#issuecomment-2088266007
