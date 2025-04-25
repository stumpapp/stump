import { IStumpClientContext } from '@/context'
import { ApolloClient, from, HttpLink, InMemoryCache } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { Api } from '@stump/sdk'
import { isAxiosError } from 'axios'

type CreateClientParams = {
	sdk: Api
} & Pick<IStumpClientContext, 'onUnauthenticatedResponse' | 'onConnectionWithServerChanged'>

export const createClient = ({
	sdk,
	onUnauthenticatedResponse,
	// onConnectionWithServerChanged,
}: CreateClientParams) => {
	const httpLink = new HttpLink({
		uri: '/api/graphql',
		fetch: buildAxiosFetch(sdk),
	})

	const errorLink = onError(({ networkError }) => {
		if (networkError && 'response' in networkError) {
			const { response } = networkError
			if (response.status === 401) {
				onUnauthenticatedResponse?.()
			}
			// TODO: determine ERR_NETWORK for onConnectionWithServerChanged
		}
	})

	return new ApolloClient({
		cache: new InMemoryCache(),
		link: from([errorLink, httpLink]),
		defaultOptions: {
			query: {
				fetchPolicy: 'cache-first',
			},
		},
	})
}

// TODO: Investigate https://github.com/axios/axios/releases/tag/v1.7.0-beta.0
const buildAxiosFetch = (sdk: Api): typeof fetch => {
	return async (uri, options) => {
		try {
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
		} catch (error) {
			if (isAxiosError(error)) {
				const resp = {
					ok: false,
					status: error.response?.status || 500,
					statusText: error.message,
					url: error.config?.url || uri.toString(),
					body: error.response?.data,
					text: async () => JSON.stringify(error.response?.data),
					json: async () => error.response?.data,
					clone: () => {},
				} as Response

				return {
					...resp,
					clone: () => resp,
				}
			} else {
				throw error
			}
		}
	}
}
