import type { EpubColumnCount } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

const isEpubColumnCount = (value: string): value is 'auto' | '1' | '2' =>
	value === 'auto' || value === '1' || value === '2'

export default function ColumnCount() {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { columnCount = 'auto' },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!isEpubColumnCount(e.target.value)) {
			console.warn(`Invalid column count: ${e.target.value}`)
			return
		}
		const next: EpubColumnCount =
			e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as 1 | 2)
		setBookPreferences({ columnCount: next })
	}

	return (
		<div className="py-1.5">
			<Label htmlFor="column-count">{t('epubReader.controls.columns')}</Label>
			<NativeSelect
				id="column-count"
				size="sm"
				options={[
					{ label: t('epubReader.controls.auto'), value: 'auto' },
					{ label: t('epubReader.controls.columnCount', { count: 1 }), value: '1' },
					{ label: t('epubReader.controls.columnCount', { count: 2 }), value: '2' },
				]}
				value={String(columnCount)}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
