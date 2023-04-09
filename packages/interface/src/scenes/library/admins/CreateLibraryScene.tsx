import { useLibraries } from '@stump/client'
import { Divider, Heading, Link, Text } from '@stump/components'

import { useLocaleContext } from '../../../i18n'
import CreateOrEditLibraryForm from './CreateOrEditLibraryForm'

export default function CreateLibraryScene() {
	const { t } = useLocaleContext()

	const { libraries } = useLibraries()

	return (
		<>
			<Heading size="lg">{t('createLibraryScene.heading')}</Heading>
			<Text size="sm" variant="muted" className="mt-1.5">
				{t('createLibraryScene.subtitle')}{' '}
				<Link href="https://stumpapp.dev/guides/libraries">
					{t('createLibraryScene.subtitleLink')}.
				</Link>
			</Text>

			<Divider variant="muted" className="my-3.5" />
			<div className="flex flex-col gap-12 pt-2">
				{libraries && <CreateOrEditLibraryForm existingLibraries={libraries} />}
			</div>
		</>
	)
}
