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
				'gap-2 p-4 flex flex-row items-center rounded-lg border border-border transition-colors',
				'hover:border-brand-400 hover:bg-muted',
				isSelected && 'border-brand-500 bg-muted',
			)}
		>
			<ProviderLogo provider={provider} />
			<Text size="sm" className="font-medium">
				{PROVIDER_LABELS[provider]}
			</Text>
		</button>
	)
}
