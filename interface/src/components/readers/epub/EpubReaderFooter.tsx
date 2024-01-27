import { Text } from '@stump/components'

import { useEpubReaderContext } from './context'
import { ControlsContainer } from './controls'

// TODO: I LOVE Yomu's footer controls! I want to make something like that!
/**
 * A component that shows at the bottom of the epub reader that shows, at least
 * currently, mostly the number of pages left in the current chapter
 */
export default function EpubReaderFooter() {
	const { bookMeta } = useEpubReaderContext().readerMeta

	const visiblePages = (bookMeta?.chapter.currentPage ?? []).filter(Boolean)
	const pagesVisible = visiblePages.length

	const chapterPageCount = bookMeta?.chapter.totalPages || 1
	const chapterName = bookMeta?.chapter.name || ''

	// If we don't have the first page or total pages, we can't show the controls for now
	if (!pagesVisible) {
		return null
	}

	const currentPage = visiblePages[0] || 1
	const virtualPage = Math.ceil(currentPage / pagesVisible)
	const virtualPageCount = Math.ceil(chapterPageCount / pagesVisible)

	return (
		<ControlsContainer position="bottom">
			<Text size="sm" variant="muted">
				{chapterName} ({virtualPage}/{virtualPageCount})
			</Text>
		</ControlsContainer>
	)
}
