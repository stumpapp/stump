import { useEpubReader } from '@stump/client'
import { ProgressBar, Text } from '@stump/components'
import { cx } from '@stump/components'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import { useEpubReaderContext, useEpubReaderControls } from './context'
import { ControlsContainer } from './controls'
import ControlButton from './controls/ControlButton'

/**
 * A component that shows at the bottom of the epub reader that shows, at least
 * currently, mostly the number of pages left in the current chapter
 */
function getSectionWidths(sectionsLengths: { [key: number]: number }) {
	const totalLength = Object.values(sectionsLengths).reduce((acc, length) => acc + length, 0)
	const chapterWidths: { [key: number]: number } = {}

	Object.entries(sectionsLengths).forEach(([keyStr, length]) => {
		const key = parseInt(keyStr)
		chapterWidths[key] = (length / totalLength) * 100.0
	})
	return chapterWidths
}

export default function EpubReaderFooter() {
	const { visible, jumpToSection } = useEpubReaderControls()
	const { bookMeta } = useEpubReaderContext().readerMeta
	const { readingDirection } = useEpubReader((state) => ({
		readingDirection: state.preferences.readingDirection,
	}))

	const invertControls = readingDirection === 'rtl'

	const [forwardOffset, backwardOffset] = invertControls ? [-1, 1] : [1, -1]

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
	const chapterProgress = Math.ceil((virtualPage / virtualPageCount) * 100)
	const currentSectionIndex = bookMeta?.chapter.sectionSpineIndex ?? -1
	const sectionWidths = getSectionWidths(bookMeta?.sectionLengths || {})

	const sectionWidthKeys = Object.keys(sectionWidths)
		.map((key) => parseInt(key))
		.sort((a, b) => a - b)

	return (
		<div>
			<ControlsContainer position="bottom">
				<Text size="sm" variant="muted">
					{chapterName} ({virtualPage}/{virtualPageCount})
				</Text>
			</ControlsContainer>
			<div className="flex items-center justify-center space-x-px">
				<ControlButton
					className={cx({ hidden: !visible })}
					onClick={() => jumpToSection(currentSectionIndex + backwardOffset)}
				>
					<ArrowLeft className={cx({ hidden: !visible }) + ' h-4 w-4'} />
				</ControlButton>
				{!!sectionWidthKeys.length &&
					sectionWidthKeys.map((index) => (
						<ProgressBar
							key={index}
							value={
								index < currentSectionIndex
									? 100
									: index === currentSectionIndex
										? chapterProgress
										: 0
							}
							size={index == currentSectionIndex ? 'lg' : 'default'}
							rounded={'default'}
							variant={index == currentSectionIndex ? 'primary' : 'default'}
							className={cx({ hidden: !visible })}
							style={{ width: `${sectionWidths[index] ? sectionWidths[index] : 0}%` }}
							onClick={() => jumpToSection(index)}
						></ProgressBar>
					))}
				<ControlButton
					className={cx({ hidden: !visible })}
					onClick={() => jumpToSection(currentSectionIndex + forwardOffset)}
				>
					<ArrowRight className={cx({ hidden: !visible }) + ' h-4 w-4'} />
				</ControlButton>
			</div>
		</div>
	)
}
