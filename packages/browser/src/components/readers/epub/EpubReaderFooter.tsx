import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useEpubReaderContext } from './context'
import { ControlsContainer } from './controls'

/** Footer progress for the Readium EPUB reader. */
export default function EpubReaderFooter() {
	const { t } = useLocaleContext()
	const { bookMeta, progress } = useEpubReaderContext().readerMeta

	if (!bookMeta) return null

	const { chapter } = bookMeta
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
							{chapter.name || t('epubReader.reading')}
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
