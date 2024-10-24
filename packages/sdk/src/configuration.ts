import { ApiVersion } from './api'

export type AuthenticationMethod = 'token' | 'session' | 'api-key'

export class Configuration {
	apiVersion: ApiVersion = 'v1'
	authMethod: AuthenticationMethod

	constructor(authMethod: AuthenticationMethod) {
		this.authMethod = authMethod
	}
}
