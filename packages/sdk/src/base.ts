import { Api } from './api'

export class APIBase {
	protected api: Api

	constructor(api: Api) {
		this.api = api
	}

	get axios() {
		return this.api.axios
	}
}
