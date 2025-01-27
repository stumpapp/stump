import { MetadataSourceSchema } from '@stump/sdk'

import { useQuery } from '../client'
import { useSDK } from '../sdk'

export function useMetadataSourcesQuery() {
	const { sdk } = useSDK()

	const { data, ...restReturn } = useQuery([sdk.metadata_sources.keys.getAll], async () =>
		sdk.metadata_sources.getAll(),
	)

	const sources = data || []

	return {
		sources,
		...restReturn,
	}
}

export function useMetadataSourceConfigQuery(name: string) {
	const { sdk } = useSDK()

	const { data, ...restReturn } = useQuery(
		[sdk.metadata_sources.keys.getSourceConfigSchema],
		async () => sdk.metadata_sources.getSourceConfigSchema(name),
	)

	const config_schema: MetadataSourceSchema | null = data ?? null

	return {
		config_schema,
		...restReturn,
	}
}
