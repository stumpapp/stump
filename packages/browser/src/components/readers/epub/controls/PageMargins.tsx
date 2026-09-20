import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

const OPTIONS = [0.5, 1, 1.5, 2]

export default function PageMargins() {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { pageMargins = 1.0 },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const next = Number(e.target.value)
		if (!OPTIONS.includes(next)) {
			console.warn(`Invalid page margins: ${e.target.value}`)
			return
		}
		setBookPreferences({ pageMargins: next })
	}

	return (
		<div className="py-1.5">
			<Label htmlFor="page-margins">{t('epubReader.controls.pageMargins')}</Label>
			<NativeSelect
				id="page-margins"
				size="sm"
				options={OPTIONS.map((value) => ({ label: `${value}x`, value: String(value) }))}
				value={String(pageMargins)}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
