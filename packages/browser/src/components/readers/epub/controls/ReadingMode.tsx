import { Label, NativeSelect } from '@stump/components'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function ReadingMode() {
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { readingMode },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setBookPreferences({ readingMode: e.target.value as any })
	}

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-mode">Reading mode</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{ label: 'Paged', value: 'paged' },
					{ label: 'Continuous', value: 'continuous:vertical' },
				]}
				value={readingMode}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
