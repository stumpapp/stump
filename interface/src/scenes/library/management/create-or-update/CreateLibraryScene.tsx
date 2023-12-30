import { useLibraries } from '@stump/client'
import { Heading, Link, Text } from '@stump/components'

import { useLocaleContext } from '@/i18n'

import { CreateOrUpdateLibraryForm } from './form'

export default function CreateLibraryScene() {
	const { t } = useLocaleContext()

	const { libraries } = useLibraries()

	return (
		<>
			<header>
				<Heading size="lg" className="font-bold">
					{t('createLibraryScene.heading')}
				</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t('createLibraryScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/libraries">
						{t('createLibraryScene.subtitleLink')}.
					</Link>
				</Text>
			</header>
			<div className="flex flex-col gap-12">
				{libraries && <CreateOrUpdateLibraryForm existingLibraries={libraries} />}
			</div>
		</>
	)
}
