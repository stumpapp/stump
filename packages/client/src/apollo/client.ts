import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client'
import { Api } from '@stump/sdk'

export const createClient = (sdk: Api) => {
	const httpLink = createHttpLink({
		uri: '/api/graphql',
		fetch: buildAxiosFetch(sdk),
	})

	return new ApolloClient({
		cache: new InMemoryCache(),
		link: httpLink,
	})
}

// TODO: Investigate https://github.com/axios/axios/releases/tag/v1.7.0-beta.0
const buildAxiosFetch = (sdk: Api): typeof fetch => {
	return async (uri, options) => {
		const response = await sdk.axios.post(uri.toString(), options?.body, {
			headers: {
				...sdk.headers,
			},
			baseURL: sdk.rootURL,
		})

		const resp = {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			statusText: response.statusText,
			url: response.config.url,
			body: response.data,
			text: async () => JSON.stringify(response.data),
			json: async () => response.data,
			clone: () => {},
		} as Response

		return {
			...resp,
			clone: () => resp,
		}
	}
}
