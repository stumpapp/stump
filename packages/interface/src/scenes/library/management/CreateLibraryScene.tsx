import { useLibraries } from '@stump/client'
import { Divider, Heading, Link, Text } from '@stump/components'

import { useLocaleContext } from '../../../i18n'
import CreateOrEditLibraryForm from './CreateOrEditLibraryForm'

export default function CreateLibraryScene() {
	const { t } = useLocaleContext()

	const { libraries } = useLibraries()

	return (
		<>
			<div>
				<Heading size="lg">{t('createLibraryScene.heading')}</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t('createLibraryScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/libraries">
						{t('createLibraryScene.subtitleLink')}.
					</Link>
				</Text>
				<Divider variant="muted" className="mt-3.5" />
			</div>
			<div className="flex flex-col gap-12">
				{libraries && <CreateOrEditLibraryForm existingLibraries={libraries} />}
			</div>
		</>
	)
}
