import { cn, Text } from '@stump/components'
import { MetadataProvider } from '@stump/graphql'
import { useFormContext, useWatch } from 'react-hook-form'

import { PROVIDER_LABELS } from './constants'
import { ProviderLogo } from './ProviderLogo'
import { CreateProviderConfigSchema } from './schema'

type Props = {
	provider: MetadataProvider
	onSelect: (provider: MetadataProvider) => void
}

export default function ProviderSelectionCard({ provider, onSelect }: Props) {
	const form = useFormContext<Pick<CreateProviderConfigSchema, 'providerType'>>()

	const selectedProvider = useWatch({
		control: form.control,
		name: 'providerType',
	})
	const isSelected = selectedProvider === provider

	return (
		<button
			onClick={() => onSelect(provider)}
			key={provider}
			type="button"
			className={cn(
				'gap-2 rounded-lg p-4 flex flex-row items-center border border-edge transition-colors',
				'hover:border-brand-400 hover:bg-background-surface',
				isSelected && 'border-brand-500 bg-background-surface',
			)}
		>
			<ProviderLogo provider={provider} />
			<Text size="sm" className="font-medium">
				{PROVIDER_LABELS[provider]}
			</Text>
		</button>
	)
}
