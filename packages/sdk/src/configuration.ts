import { ApiVersion } from './api'

export type AuthenticationMethod = 'token' | 'session' | 'api-key' | 'basic'

export class Configuration {
	apiVersion: ApiVersion = 'v2'
	authMethod: AuthenticationMethod

	constructor(authMethod: AuthenticationMethod) {
		this.authMethod = authMethod
	}
}
