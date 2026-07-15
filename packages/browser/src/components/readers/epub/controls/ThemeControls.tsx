import { Dialog, Heading } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { Paintbrush } from 'lucide-react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'
import ColumnCount from './ColumnCount'
import ControlButton from './ControlButton'
import FontFamily from './FontFamily'
import FontSizeControl from './FontSizeControl'
import LineHeightControl from './LineHeightControl'
import PageMargins from './PageMargins'
import ReadingDirection from './ReadingDirection'
import ReadingModeControl from './ReadingMode'

export default function ThemeControls() {
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { readingMode },
	} = useBookPreferences({ book })

	const isContinuous = readingMode === ReadingMode.ContinuousVertical

	return (
		<Dialog>
			<Dialog.Trigger asChild>
				<ControlButton title="Theme and options">
					<Paintbrush className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content size="md" className="gap-4 z-101 flex flex-col bg-muted">
				<Heading size="md">Appearance</Heading>

				<FontFamily />
				<FontSizeControl />
				<LineHeightControl />
				<ReadingDirection />
				<ReadingModeControl />
				{!isContinuous && <ColumnCount />}
				<PageMargins />
			</Dialog.Content>
		</Dialog>
	)
}
