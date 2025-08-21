import { User } from '@stump/graphql'

import { APIBase } from '../base'
import { AuthUser } from '../types/graphql'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

export type JwtTokenPair = {
	accessToken: string
	refreshToken?: string | null
	expiresAt: string // Date
}

export type LoginResponse =
	| AuthUser
	| ({
			forUser: AuthUser
	  } & JwtTokenPair)

export type PasswordUserInput = {
	username: string
	password: string
}

/**
 * The root route for the auth API
 */
const AUTH_PATH = '/auth'
/**
 * A helper function to format the URL for auth API routes with optional query parameters
 */
const authURL = createRouteURLHandler(AUTH_PATH)

/**
 * The auth API controller, used for interacting with the auth endpoints of the Stump API
 */
export class AuthAPI extends APIBase {
	/**
	 * Fetch the currently authenticated user, if any. This will throw an error if unauthenticated.
	 */
	async me(): Promise<AuthUser> {
		const { data: user } = await this.api.axios.get<AuthUser>(authURL('/viewer'))
		return user
	}

	/**
	 * Authenticate a user with the given username and password. This will either rely on session-based
	 * authentication or token-based authentication, depending on the API configuration.
	 */
	async login({ username, password }: PasswordUserInput): Promise<LoginResponse> {
		const response = await this.api.axios.post<LoginResponse>(
			authURL(
				'/login',
				this.api.isTokenAuth ? { create_session: false, generate_token: true } : undefined,
			),
			{
				password,
				username,
			},
		)

		if ('forUser' in response.data) {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { forUser: _, ...token } = response.data
			this.api.tokens = token
		}

		return response.data
	}

	async refreshToken(): Promise<JwtTokenPair> {
		const response = await this.api.axios.post<JwtTokenPair>(authURL('/refresh-token'), undefined, {
			headers: {
				Authorization: `Bearer ${this.api.tokens?.refreshToken}`,
			},
		})

		if ('accessToken' in response.data) {
			this.api.tokens = response.data
		} else {
			throw new Error('Malformed exchange payload')
		}

		return response.data
	}

	/**
	 * Register a new user with the given username and password
	 */
	async register({ username, password }: PasswordUserInput): Promise<User> {
		const response = await this.api.axios.post<User>(authURL('/register'), {
			password,
			username,
		})

		return response.data
	}

	/**
	 * Log out the currently authenticated user. If token-based authentication is used, the token will be
	 * removed from the API instance.
	 */
	async logout(): Promise<void> {
		if (this.api.isTokenAuth) {
			await this.api.axios.post(authURL('/logout'))
			this.api.tokens = undefined
		} else {
			await this.api.axios.post(authURL('/logout'))
		}
	}

	/**
	 * The query keys for the auth API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof AuthAPI>> {
		return {
			login: 'auth.login',
			logout: 'auth.logout',
			me: 'auth.me',
			register: 'auth.register',
			refreshToken: 'auth.refreshToken',
		}
	}
}
