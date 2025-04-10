import { Api } from '@stump/sdk'
import { Environment, Network, Observable, RecordSource, Store } from 'relay-runtime'

export const createEnvironment = (sdk: Api): Environment =>
	new Environment({
		network: Network.create((params, variables) =>
			Observable.create((sink) => {
				sdk.axios
					.post('/api/graphql', {
						query: params.text,
						variables,
					})
					.then((response) => {
						sink.next(response.data)
						sink.complete()
					})
					.catch((error) => {
						sink.error(error)
					})
			}),
		),
		store: new Store(new RecordSource()),
	})
