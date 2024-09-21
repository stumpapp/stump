import { LoginResponse, User } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

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
	async me(): Promise<User> {
		const { data: user } = await this.api.axios.get<User>(authURL('/me'))
		return user
	}

	/**
	 * Authenticate a user with the given username and password. This will either rely on session-based
	 * authentication or token-based authentication, depending on the API configuration.
	 */
	async login(username: string, password: string): Promise<User> {
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

		let user: User
		if ('token' in response.data) {
			const {
				for_user,
				token: { access_token },
			} = response.data
			this.api.token = access_token
			user = for_user
		} else {
			user = response.data
		}

		return user
	}

	/**
	 * Log out the currently authenticated user
	 */
	async logout(): Promise<void> {
		if (this.api.isTokenAuth) {
			await this.api.axios.delete(authURL('/token'))
		} else {
			await this.api.axios.post(authURL('/logout'))
		}
	}

	/**
	 * The query keys for the auth API, used for query caching on a client (e.g. react-query)
	 */
	get keys(): ClassQueryKeys<InstanceType<typeof AuthAPI>> {
		return { login: 'auth.login', logout: 'auth.logout', me: 'auth.me' }
	}
}
