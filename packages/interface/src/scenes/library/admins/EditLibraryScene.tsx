import { useLibraries, useLibraryByIdQuery } from '@stump/client'
import { Divider, Heading, Link, Text } from '@stump/components'
import { useParams } from 'react-router'

import { useLocaleContext } from '../../../i18n/context'
import CreateOrEditLibraryForm from './CreateOrEditLibraryForm'
import QuickActions from './QuickActions'

export default function EditLibraryScene() {
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
		<>
			<Heading size="lg">{t('manageLibraryScene.heading')}</Heading>
			<Text size="sm" variant="muted">
				{t('manageLibraryScene.subtitle')}{' '}
				<Link href="https://stumpapp.dev/guides/libraries">
					{t('manageLibraryScene.subtitleLink')}.
				</Link>
			</Text>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex flex-col gap-12 pt-2">
				{libraries && (
					<>
						<QuickActions />
						<CreateOrEditLibraryForm existingLibraries={libraries} library={library} />
					</>
				)}
			</div>
		</>
	)
}
