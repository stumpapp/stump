import { Api } from './api'

export class APIBase {
	protected api: Api

	constructor(api: Api) {
		this.api = api
	}

	get axios() {
		return this.api.axios
	}

	get serviceURL() {
		return this.api.serviceURL
	}

	withServiceURL(url: string) {
		return `${this.serviceURL}${url}`.replace(/([^:]\/)\/+/g, '$1')
	}
}
