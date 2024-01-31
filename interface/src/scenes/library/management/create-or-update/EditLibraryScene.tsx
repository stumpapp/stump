import { useLibraries, useLibraryByIdQuery } from '@stump/client'
import { Heading, Link, Text } from '@stump/components'
import { useParams } from 'react-router'

import { Container, ContentContainer } from '@/components/container'

import { useLocaleContext } from '../../../../i18n/context'
import QuickActions from '../QuickActions'
import { CreateOrUpdateLibraryForm } from './form'

export default function ManageLibraryScene() {
	const { id } = useParams()
	const { t } = useLocaleContext()
	const { libraries } = useLibraries()
	const { library, isLoading } = useLibraryByIdQuery(id || '', { enabled: !!id })

	if (!id) {
		throw new Error('Library ID is required')
	} else if (isLoading) {
		return null
	} else if (!library) {
		throw new Error('Library not found')
	}

	return (
		<Container disableHorizontalPadding>
			<div>
				<Heading size="lg">{t('manageLibraryScene.heading')}</Heading>
				<Text size="sm" variant="muted">
					{t('manageLibraryScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/libraries">
						{t('manageLibraryScene.subtitleLink')}.
					</Link>
				</Text>
			</div>

			<ContentContainer>
				{libraries && (
					<>
						<QuickActions library={library} />
						<CreateOrUpdateLibraryForm existingLibraries={libraries} library={library} />
					</>
				)}
			</ContentContainer>
		</Container>
	)
}
