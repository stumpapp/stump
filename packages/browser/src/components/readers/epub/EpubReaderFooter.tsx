import { Text } from '@stump/components'

import { useEpubReaderContext, useEpubReaderControls } from './context'
import { ControlsContainer } from './controls'

/**
 * Footer progress for EPUB readers.
 * Prefer Readium position/totalProgression; fall back to epub.js chapter pages.
 */
export default function EpubReaderFooter() {
	const { jumpToSection } = useEpubReaderControls()
	const { bookMeta, progress } = useEpubReaderContext().readerMeta

	if (!bookMeta) return null

	const { chapter, sectionLengths } = bookMeta

	// Readium path: overall progression + optional chapter label
	const hasReadiumProgress =
		chapter.totalProgression != null ||
		chapter.locatorPosition != null ||
		(progress != null && Object.keys(sectionLengths).length === 0)

	if (hasReadiumProgress && Object.keys(sectionLengths).length === 0) {
		const totalProgression = chapter.totalProgression ?? progress ?? 0
		const pct = Math.round(Math.min(1, Math.max(0, totalProgression)) * 100)
		const positionLabel =
			chapter.locatorPosition != null && chapter.totalPositions != null
				? `${chapter.locatorPosition} / ${chapter.totalPositions}`
				: `${pct}%`

		return (
			<div>
				<ControlsContainer position="bottom" className="h-[33px]">
					<div className="gap-y-1 z-50 flex flex-1 flex-col">
						<div className="gap-2 flex items-center justify-between">
							<Text size="xs" variant="muted" className="line-clamp-1">
								{chapter.name || 'Reading'}
							</Text>
							<Text size="xs" variant="muted">
								{positionLabel}
							</Text>
						</div>
						<div className="h-1.25 relative w-full overflow-hidden rounded-full bg-muted-foreground/50">
							<div
								className="inset-y-0 left-0 absolute bg-muted-foreground"
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				</ControlsContainer>
			</div>
		)
	}

	// Legacy epub.js footer
	const visiblePages = (chapter.currentPage ?? []).filter(Boolean)
	let pagesVisible = visiblePages.length
	if (visiblePages.every((page) => page === visiblePages[0])) {
		pagesVisible = 1
	}

	const chapterPageCount = chapter.totalPages || 1
	const chapterName = chapter.name || ''

	if (!pagesVisible) {
		return null
	}

	const currentPage = visiblePages[0] || 1
	const virtualPage = Math.ceil(currentPage / pagesVisible)
	const virtualPageCount = Math.ceil(chapterPageCount / pagesVisible)
	const chapterProgress = Math.ceil((virtualPage / virtualPageCount) * 100)
	const currentSectionIndex = chapter.sectionSpineIndex ?? -1
	const sectionWidths = getSectionWidths(sectionLengths || {})
	const sectionWidthKeys = Object.keys(sectionWidths)
		.map((key) => parseInt(key))
		.sort((a, b) => a - b)

	return (
		<div>
			<ControlsContainer position="bottom" className="h-[33px]">
				<div className="gap-y-1 z-50 flex flex-1 flex-col">
					<div>
						<Text size="xs" variant="muted">
							{chapterName} ({virtualPage}/{virtualPageCount})
						</Text>
					</div>

					<div className="flex flex-1 items-center justify-center space-x-px">
						{sectionWidthKeys.map((index) => (
							<div
								key={`section-${index}`}
								className="h-1.25 relative cursor-pointer bg-muted-foreground/50"
								style={{ width: `${sectionWidths[index] ? sectionWidths[index] : 0}%` }}
								onClick={() => jumpToSection(index)}
							>
								{index === currentSectionIndex && (
									<div
										className="top-0 w-0.5 absolute h-full bg-muted-foreground"
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

function getSectionWidths(sectionsLengths: { [key: number]: number }) {
	const totalLength = Object.values(sectionsLengths).reduce((acc, length) => acc + length, 0)
	const chapterWidths: { [key: number]: number } = {}

	Object.entries(sectionsLengths).forEach(([keyStr, length]) => {
		const key = parseInt(keyStr)
		chapterWidths[key] = totalLength ? (length / totalLength) * 100.0 : 0
	})
	return chapterWidths
}
