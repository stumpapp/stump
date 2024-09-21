import { LoginResponse, User } from '@stump/types'

import { APIBase } from '../base'
import { ClassQueryKeys } from './types'
import { createRouteURLHandler } from './utils'

const AUTH_PATH = '/auth'
const authURL = createRouteURLHandler(AUTH_PATH)

export class AuthAPI extends APIBase {
	async me(): Promise<User> {
		const { data: user } = await this.api.axios.get<User>(authURL('/me'))
		return user
	}

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

	async logout(): Promise<void> {
		if (this.api.isTokenAuth) {
			await this.api.axios.delete(authURL('/token'))
		} else {
			await this.api.axios.post(authURL('/logout'))
		}
	}

	get keys(): ClassQueryKeys<InstanceType<typeof AuthAPI>> {
		return { login: 'login', logout: 'logout', me: 'me' }
	}
}
