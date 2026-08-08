import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'

import GenericEmptyState from '@/components/GenericEmptyState'

import { useEpubReaderContext } from '../context'

type Props = {
	onLocationChanged?: () => void
}
export default function Bookmarks({ onLocationChanged }: Props) {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookMeta },
		controls: { onGoToCfi },
	} = useEpubReaderContext()

	const bookmarks = useMemo(() => bookMeta?.bookmarks || {}, [bookMeta])
	const bookmarksArray = useMemo(
		() => Object.values(bookmarks).filter((bookmark) => !!bookmark.epubcfi),
		[bookmarks],
	)

	const handleSelect = useCallback(
		(cfi: string) => {
			onGoToCfi(cfi)
			onLocationChanged?.()
		},
		[onGoToCfi, onLocationChanged],
	)

	if (!bookmarksArray.length) {
		return <GenericEmptyState title={t('readerUi.locations.noBookmarks')} />
	}

	return (
		<div className="px-2 scrollbar-hide flex max-h-full flex-col divide-y divide-border overflow-y-auto">
			{bookmarksArray.map(({ previewContent, epubcfi }) => (
				<button
					key={epubcfi}
					className="gap-1.5 p-2 px-1 py-1.5 flex flex-col justify-start text-left hover:bg-muted"
					onClick={() => handleSelect(epubcfi as string)}
					disabled={!epubcfi?.length}
				>
					<Text variant="muted" size="xs">
						{epubcfi}
					</Text>
					<Text size="sm">{previewContent}</Text>
				</button>
			))}
		</div>
	)
}
