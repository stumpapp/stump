import { Heading, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import DeleteLibraryThumbnails from './DeleteLibraryThumbnails'
import LibraryThumbnailSelector from './LibraryThumbnailSelector'

export default function ThumbnailManagementSection() {
	const { t } = useLocaleContext()

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>

			<LibraryThumbnailSelector />
			<DeleteLibraryThumbnails />
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.options/thumbnails.sections.management'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
