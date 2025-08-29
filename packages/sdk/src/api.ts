import type { TypedDocumentString } from '@stump/graphql'
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

import { AuthenticationMethod, Configuration } from './configuration'
import { cacheKeys } from './constants'
import {
	AuthAPI,
	EpubAPI,
	JwtTokenPair,
	LibraryAPI,
	MediaAPI,
	OPDSV2API,
	SeriesAPI,
	ServerAPI,
} from './controllers'
import {
	attemptWebsocketConnect,
	GraphQLWebsocketConnectEventHandlers,
	GraphQLWebsocketConnectReturn,
} from './socket'
import { GraphQLResponse } from './types/graphql'
import { formatApiURL } from './utils'

export type ApiVersion = 'v1' | 'v2'

export type ApiParams = {
	baseURL: string
	customHeaders?: Record<string, string>
	shouldFormatURL?: boolean
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

// TODO(graphql): Add cacheKeys for centralized cache invalidation features. Previously, this
// was the responsibility of any given controller, but now that we aren't using REST and the
// majority of API calls using this class will be routed through `execute`, it makes sense to
// centralize this functionality somewhere else

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

	private _tokens?: JwtTokenPair
	private _apiKey?: string

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

	private _shouldFormatURL = true

	/**
	 * Create a new instance of the API
	 * @param baseURL The base URL to the Stump server
	 */
	constructor({ baseURL, authMethod = 'session', apiKey, ...params }: ApiParams) {
		this.baseURL = baseURL
		this.configuration = new Configuration(authMethod)

		if (apiKey) {
			this._apiKey = apiKey
		}

		if (params.customHeaders) {
			this._customHeaders = params.customHeaders
		}

		if (params.shouldFormatURL !== undefined) {
			this._shouldFormatURL = params.shouldFormatURL
		}

		const instance = axios.create({
			baseURL: this.serviceURL,
			withCredentials: this.configuration.authMethod === 'session',
		})

		instance.interceptors.request.use(async (config) => {
			config.headers = config.headers.concat(await this.getHeaders())
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
		return this.configuration.authMethod === 'token' || this.configuration.authMethod === 'api-key'
	}

	/**
	 * A getter for the Axios instance
	 */
	get axios(): AxiosInstance {
		return this.axiosInstance
	}

	get token(): string | undefined {
		return this._tokens?.accessToken || this._apiKey
	}

	get tokens(): JwtTokenPair | undefined {
		return this._tokens
	}

	set tokens(tokens: JwtTokenPair | undefined) {
		this._tokens = tokens
	}

	get staticToken(): string | undefined {
		return this._apiKey
	}

	set staticToken(token: string | undefined) {
		this._apiKey = token
	}

	async getOrRefreshTokens(): Promise<JwtTokenPair | undefined> {
		const tokens = this._tokens

		if (!tokens) return undefined

		// Let's exchange the token if the expiry is <= 5 minute
		const expiresAt = new Date(tokens.expiresAt)
		if (expiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
			try {
				const newTokens = await this.auth.refreshToken()
				this.tokens = newTokens
			} catch (error) {
				console.error('Failed to exchange token!', { error })
				// If we fail to exchange the token, we should clear it
				this.tokens = undefined
			}
		}

		return this._tokens
	}

	async accessToken(): Promise<string | undefined> {
		return (await this.getOrRefreshTokens())?.accessToken
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
	 * Check if the API is currently *has* auth. This could return a false positive if the
	 * access token is expired or invalid.
	 */
	get isAuthed(): boolean {
		return !!this._tokens || !!this._basicAuth || !!this._apiKey
	}

	/**
	 * Set custom headers to be sent with every request
	 */
	set customHeaders(headers: Record<string, string>) {
		this._customHeaders = headers
	}

	get customHeaders(): Record<string, string> {
		return this._customHeaders
	}

	/**
	 * Get the URL of the Stump service
	 */
	get serviceURL(): string {
		return this._shouldFormatURL
			? formatApiURL(this.baseURL, this.configuration.apiVersion)
			: this.baseURL
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

	get rootURL(): string {
		return `${this.baseURL.replace(/\/api(\/v\d)?$/, '')}`
	}

	async getAuthorizationHeader(): Promise<string | undefined> {
		const bearerToken = this._apiKey || (await this.accessToken())
		if (bearerToken) {
			return `Bearer ${bearerToken}`
		} else if (this.basicAuthHeader) {
			return `Basic ${this.basicAuthHeader}`
		} else {
			return undefined
		}
	}

	/**
	 * Get the current access token for the API formatted as a Bearer token. This
	 * has the potential to return an expired token
	 */
	get authorizationHeader(): string | undefined {
		const bearerToken = this._tokens?.accessToken || this._apiKey
		if (bearerToken) {
			return `Bearer ${bearerToken}`
		} else if (this.basicAuthHeader) {
			return `Basic ${this.basicAuthHeader}`
		} else {
			return undefined
		}
	}

	async getHeaders(): Promise<Record<string, string>> {
		const headers: Record<string, string> = {
			...this.customHeaders,
		}

		const authHeader = await this.getAuthorizationHeader()
		if (authHeader) {
			headers.Authorization = authHeader
		}

		return headers
	}

	/**
	 * Get the headers to be sent with every request
	 */
	get headers(): Record<string, string> {
		return {
			...this.customHeaders,
			...(this.authorizationHeader ? { Authorization: this.authorizationHeader } : {}),
		}
	}

	async execute<TResult, TVariables>(
		query: TypedDocumentString<TResult, TVariables>,
		variables?: TVariables extends Record<string, never> ? never : TVariables,
		config?: Pick<AxiosRequestConfig, 'onUploadProgress'>,
	): Promise<TResult> {
		const response = await this.axiosInstance.post<GraphQLResponse<TResult>>(
			'/api/graphql',
			{
				query,
				variables,
			},
			{
				headers: {
					...this.headers,
				},
				baseURL: this.rootURL,
				...config,
			},
		)

		const { data, errors } = response.data

		if (errors) {
			const firstExtensionError = errors.find((error) => error.extensions?.error)?.extensions?.error
			if (firstExtensionError && typeof firstExtensionError === 'string') {
				throw new Error(firstExtensionError)
			}
			throw new Error(errors.map((error) => error.message).join(', '))
		}

		return data
	}

	async executeRaw<TResult = unknown, TVariables = Record<string, unknown> | never>(
		queryString: string,
		variables?: TVariables extends Record<string, never> ? never : TVariables,
		config?: Omit<AxiosRequestConfig, 'headers'>,
	): Promise<TResult> {
		const response = await this.axiosInstance.post<GraphQLResponse<TResult>>(
			'/api/graphql',
			{
				query: queryString,
				variables,
			},
			{
				headers: {
					...this.headers,
				},
				baseURL: this.rootURL,
				...config,
			},
		)

		const { data, errors } = response.data

		if (errors) {
			// TODO: Create specialized error to handle this better
			throw new Error(errors.map((error) => error.message).join(', '))
		}

		return data
	}

	async connect<TResult, TVariables>(
		query: TypedDocumentString<TResult, TVariables>,
		variables?: TVariables extends Record<string, never> ? never : TVariables,
		options: Partial<GraphQLWebsocketConnectEventHandlers<TResult>> = {},
	): Promise<GraphQLWebsocketConnectReturn> {
		return attemptWebsocketConnect<TResult, TVariables>({
			query,
			variables,
			sdk: this,
			...options,
		})
	}

	get cacheKeys(): typeof cacheKeys {
		return cacheKeys
	}

	/**
	 * A convenience method to generate a cache key for a given API call. This is intended to be used
	 * with `@tanstack/react-query` to ensure that cache keys are consistent across the application
	 *
	 * @param key The prefix key for the cache key
	 * @param args Any additional arguments to be included in the cache key
	 */
	cacheKey(key: keyof typeof cacheKeys, args?: unknown[]): readonly unknown[] {
		return [cacheKeys[key], ...(args || [])]
	}

	/**
	 * Get an instance for the AuthAPI
	 */
	get auth(): AuthAPI {
		return new AuthAPI(this)
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

	/**
	 * Get an instance for the MediaAPI
	 */
	get media(): MediaAPI {
		return new MediaAPI(this)
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
}
