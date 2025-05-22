import { Label, NativeSelect } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useCallback } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function ReadingDirectionSelect() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingDirection },
		setBookPreferences,
	} = useBookPreferences({ book })

	/**
	 * A change handler for the reading direction select, asserting that the value
	 * is either 'ltr' or 'rtl' before setting the reading direction in the book preferences.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isReadingDirection(e.target.value)) {
				setBookPreferences({ readingDirection: e.target.value })
			} else {
				console.warn(`Invalid reading direction: ${e.target.value}`)
			}
		},
		[setBookPreferences],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-direction">Reading direction</Label>
			<NativeSelect
				id="reading-direction"
				size="sm"
				options={[
					{ label: 'Left to right', value: 'LTR' },
					{ label: 'Right to left', value: 'RTL' },
				]}
				value={readingDirection}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isReadingDirection = (value: string): value is ReadingDirection =>
	value === 'LTR' || value === 'RTL'
