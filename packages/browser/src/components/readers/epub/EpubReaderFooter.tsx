import { Text } from '@stump/components'

import { useEpubReaderContext, useEpubReaderControls } from './context'
import { ControlsContainer } from './controls'

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
	const { jumpToSection } = useEpubReaderControls()
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
	const chapterProgress = Math.ceil((virtualPage / virtualPageCount) * 100)
	const currentSectionIndex = bookMeta?.chapter.sectionSpineIndex ?? -1
	const sectionWidths = getSectionWidths(bookMeta?.sectionLengths || {})

	const sectionWidthKeys = Object.keys(sectionWidths)
		.map((key) => parseInt(key))
		.sort((a, b) => a - b)

	return (
		<div>
			<ControlsContainer position="bottom" className="h-[33px]">
				<div className="z-50 flex flex-1 flex-col gap-y-1">
					<div>
						<Text size="xs" variant="muted">
							{chapterName} ({virtualPage}/{virtualPageCount})
						</Text>
					</div>

					<div className="flex flex-1 items-center justify-center space-x-px">
						{sectionWidthKeys.map((index) => (
							<div
								key={`section-${index}`}
								className="relative h-[5px] cursor-pointer bg-foreground-muted/50"
								style={{ width: `${sectionWidths[index] ? sectionWidths[index] : 0}%` }}
								onClick={() => jumpToSection(index)}
							>
								{index === currentSectionIndex && (
									<div
										className="absolute top-0 h-full w-[2px] bg-foreground-muted"
										style={{ left: `${chapterProgress}%` }}
									/>
								)}
							</div>
						))}
					</div>
				</div>
			</ControlsContainer>
		</div>
	)
}
