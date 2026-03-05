import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, Button, Heading, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Info } from 'lucide-react'
import { useCallback } from 'react'

import { useLibraryContext } from '@/scenes/library/context'

const query = graphql(`
	query InitFetchJobCheckProviders {
		metadataProviderConfigs {
			id
		}
	}
`)

const mutation = graphql(`
	mutation InitFetchJob($id: ID!) {
		fetchLibraryMetadata(id: $id)
	}
`)

export default function InitFetchJob() {
	const { library } = useLibraryContext()
	const { t } = useLocaleContext()

	const {
		data: { metadataProviderConfigs },
	} = useSuspenseGraphQL(query, ['metadataProviderConfigs', 'initFetchJob', library.id])
	const { mutate } = useGraphQLMutation(mutation)

	const handleFetch = useCallback(() => mutate({ id: library.id }), [library.id, mutate])

	return (
		<div className="flex flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			{metadataProviderConfigs.length === 0 && (
				<Alert variant="info">
					<Info />
					<AlertTitle>{t(getKey('noProviders.title'))}</AlertTitle>
					<AlertDescription>{t(getKey('noProviders.description'))}</AlertDescription>
				</Alert>
			)}

			<div>
				<Button size="md" variant="primary" onClick={handleFetch}>
					{t(getKey('fetchButton'))}
				</Button>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.integrations/metadata.sections.fetchMetadata'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
