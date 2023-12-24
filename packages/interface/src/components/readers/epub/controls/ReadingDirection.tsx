import { useEpubReader } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import React from 'react'

export default function ReadingDirection() {
	const { readingDirection, setReadingDirection } = useEpubReader((store) => ({
		readingDirection: store.preferences.readingDirection,
		setReadingDirection: store.setReadingDirection,
	}))

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value === 'ltr' || e.target.value === 'rtl') {
			setReadingDirection(e.target.value)
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
