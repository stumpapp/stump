import { Dialog, Heading } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
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
	const { t } = useLocaleContext()
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
				<ControlButton title={t('epubReader.themeAndOptions')}>
					<Paintbrush className="h-4 w-4" />
				</ControlButton>
			</Dialog.Trigger>

			<Dialog.Content size="md" className="gap-4 z-101 flex flex-col bg-muted">
				<Heading size="md">{t('epubReader.appearance')}</Heading>

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
