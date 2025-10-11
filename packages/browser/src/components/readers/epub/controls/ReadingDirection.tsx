import { Label, NativeSelect } from '@stump/components'
import { ReadingDirection as ReadingDirectionGQL } from '@stump/graphql'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext } from '../context'

export default function ReadingDirection() {
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		bookPreferences: { readingDirection },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === 'LTR' || e.target.value === 'RTL') {
			setBookPreferences({ readingDirection: e.target.value as ReadingDirectionGQL })
		} else {
			console.warn(`Invalid reading direction: ${e.target.value}`)
		}
	}

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-direction">Reading direction</Label>
			<NativeSelect
				id="reading-direction"
				size="sm"
				options={[
					{ label: 'Left to right', value: 'ltr' },
					{ label: 'Right to left', value: 'rtl' },
				]}
				value={readingDirection}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
