import { Heading, Link, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import CreateLibraryStepDetails from './CreateLibraryStepDetails'
import CreateLibraryStepIndicators from './CreateLibraryStepIndicators'

export default function CreateLibraryHeader() {
	const { t } = useLocaleContext()

	return (
		<header className="flex w-full flex-col space-y-6 border-b border-b-edge p-4">
			<div>
				<Heading size="lg" className="font-bold">
					{t('createLibraryScene.heading')}
				</Heading>
				<Text size="sm" variant="muted" className="mt-1.5">
					{t('createLibraryScene.subtitle')}{' '}
					<Link href="https://stumpapp.dev/guides/basics/libraries">
						{t('createLibraryScene.subtitleLink')}.
					</Link>
				</Text>
			</div>

			<CreateLibraryStepIndicators />

			<CreateLibraryStepDetails />
		</header>
	)
}
