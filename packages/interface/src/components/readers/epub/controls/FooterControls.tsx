import { Text } from '@stump/components'

import pluralizeStat from '../../../../utils/pluralize'
import { useEpubReaderContext } from '../context'
import ControlsContainer from './ControlsContainer'

/**
 * A component that shows at the bottom of the epub reader that shows, at least
 * currently, mostly the number of pages left in the current chapter
 */
export default function FooterControls() {
	const { bookMeta } = useEpubReaderContext().readerMeta

	const firstPage = bookMeta?.chapter.currentPage?.[0]
	const totalPages = bookMeta?.chapter.totalPages

	// If we don't have the first page or total pages, we can't show the controls for now
	if (firstPage === undefined || totalPages === undefined) {
		return null
	}

	/**
	 * The pages left in the current chapter. The pages are not zero-indexed, but
	 * we need to count the current page as well, so we subtract 1 from the first
	 */
	const pagesLeftInChapter = totalPages - (firstPage - 1)

	return (
		<ControlsContainer position="bottom">
			<Text size="sm" variant="muted">
				{pluralizeStat('page', pagesLeftInChapter)} left in chapter
			</Text>
		</ControlsContainer>
	)
}
