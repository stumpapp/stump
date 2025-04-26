import { ApiVersion } from './api'
import { DEFAULT_SOCKET_TIMEOUT } from './socket'

export type AuthenticationMethod = 'token' | 'session' | 'api-key' | 'basic'

export class Configuration {
	apiVersion: ApiVersion = 'v2'
	authMethod: AuthenticationMethod
	// TODO: make easy to config this
	socketTimeout: number = DEFAULT_SOCKET_TIMEOUT

	constructor(authMethod: AuthenticationMethod) {
		this.authMethod = authMethod
	}
}
