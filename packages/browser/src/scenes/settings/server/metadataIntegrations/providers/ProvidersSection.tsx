import { useSuspenseGraphQL } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense } from 'react'

import { CreateProviderDialog } from './CreateProviderDialog'
import { ExistingProviderCard } from './ExistingProviderCard'

const query = graphql(`
	query ProvidersSectionGetProviders {
		metadataProviderConfigs {
			id
			...ExistingProviderCard
		}
	}
`)

function ProviderCards() {
	const {
		data: { metadataProviderConfigs: providers },
	} = useSuspenseGraphQL(query, ['metadataProviderConfigs'])
	const { t } = useLocaleContext()

	if (providers.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-edge p-8">
				<Text size="sm" variant="muted">
					{t('settingsScene.server/metadataIntegrations.noProviders')}
				</Text>
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-1 lg:grid-cols-2">
			{providers.map((provider) => (
				<ExistingProviderCard key={provider.id} data={provider} />
			))}
		</div>
	)
}

export default function ProvidersSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between">
				<div>
					<Heading size="sm">
						{t('settingsScene.server/metadataIntegrations.providers.title')}
					</Heading>
					<Text size="sm" variant="muted" className="mt-1">
						{t('settingsScene.server/metadataIntegrations.providers.description')}
					</Text>
				</div>

				<CreateProviderDialog />
			</div>

			<Suspense fallback={null}>
				<ProviderCards />
			</Suspense>
		</div>
	)
}
