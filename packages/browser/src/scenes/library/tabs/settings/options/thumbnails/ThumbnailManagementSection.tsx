import { Heading, NewCard, Text } from '@stump/components'

import { useTranslate } from '@/hooks/useTranslate'

import DeleteLibraryThumbnails from './DeleteLibraryThumbnails'
import LibraryThumbnailSelector from './LibraryThumbnailSelector'
import ProcessLibraryThumbnails from './ProcessLibraryThumbnails'
import RegenerateThumbnails from './RegenerateThumbnails'

export default function ThumbnailManagementSection() {
	const { t, translate } = useTranslate()

	return (
		<NewCard label={translate('shared.common.management')}>
			<LibraryThumbnailSelector />
			<RegenerateThumbnails />
			<ProcessLibraryThumbnails />
			<DeleteLibraryThumbnails />
		</NewCard>
	)

	return (
		<div className="gap-6 flex grow flex-col">
			<div>
				<Heading size="sm">{t(getKey('heading'))}</Heading>
				<Text size="sm" variant="muted">
					{t(getKey('description'))}
				</Text>
			</div>
		</div>
	)
}

const LOCALE_KEY = 'librarySettingsScene.options/thumbnails.sections.management'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
