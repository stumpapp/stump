import { Label, NativeSelect } from '@stump/components'
import { ReadingMode as ReadingModeType } from '@stump/graphql'

import { useTranslate } from '@/hooks/useTranslate'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function ReadingMode() {
	const { translate } = useTranslate()
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { readingMode },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setBookPreferences({ readingMode: e.target.value as ReadingModeType })
	}

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-mode">{translate('shared.readerSettings.readingMode.label')}</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{ label: translate('shared.readerSettings.readingMode.options.PAGED'), value: ReadingModeType.Paged },
					{ label: translate('shared.epubReader.controls.continuous'), value: ReadingModeType.ContinuousVertical },
				]}
				value={readingMode}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
