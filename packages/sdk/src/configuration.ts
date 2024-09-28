import { ApiVersion } from './api'

export type AuthenticationMethod = 'token' | 'session'

export class Configuration {
	apiVersion: ApiVersion = 'v1'
	authenticationMethod: AuthenticationMethod

	constructor(authenticationMethod: AuthenticationMethod) {
		this.authenticationMethod = authenticationMethod
	}
}
