import { Label, NativeSelect } from '@stump/components'
import { ReadingMode as ReadingModeType } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function ReadingMode() {
	const { t } = useLocaleContext()
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
			<Label htmlFor="reading-mode">{t('readerUi.readingMode')}</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{ label: t('readerUi.paged'), value: ReadingModeType.Paged },
					{ label: t('readerUi.continuous'), value: ReadingModeType.ContinuousVertical },
				]}
				value={readingMode}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
