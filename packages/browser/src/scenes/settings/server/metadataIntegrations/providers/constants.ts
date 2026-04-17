import { MetadataProvider } from '@stump/graphql'

export const PROVIDER_LABELS: Record<MetadataProvider, string> = {
	[MetadataProvider.Hardcover]: 'Hardcover',
}

export const PROVIDERS = Object.values(MetadataProvider)
