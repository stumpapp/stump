import { useQuery } from '../client'
import { useSDK } from '../sdk'

export function useMetadataSourcesQuery() {
	const { sdk } = useSDK()

	const { data, ...restReturn } = useQuery([sdk.metadata_sources.keys.get], async () =>
		sdk.metadata_sources.get(),
	)

	const sources = data || []

	//const sources = sdk.metadata_sources.get()

	return {
		sources,
		...restReturn,
	}
}
