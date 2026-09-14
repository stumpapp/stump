import { useGraphQLMutation, useSuspenseGraphQL } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, Button, Heading, Text } from '@stump/components'
import { extractErrorMessage, graphql } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Info } from 'lucide-react'
import { toast } from 'sonner'

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

	const { mutate } = useGraphQLMutation(mutation, {
		onError: (error) => {
			const message = extractErrorMessage(error)
			toast.error(t(getKey('fetchError')), {
				description: message,
			})
		},
	})

	const handleFetch = () => mutate({ id: library.id })

	return (
		<div className="gap-6 flex flex-col">
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
				<Button onClick={handleFetch} disabled={metadataProviderConfigs.length === 0}>
					{t(getKey('fetchButton'))}
				</Button>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.integrations/metadata.sections.fetchMetadata'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
