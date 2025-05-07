import { Label, NativeSelect } from '@stump/components'
import { useCallback } from 'react'

type Props = {
	direction: 'ltr' | 'rtl'
	onChange: (direction: 'ltr' | 'rtl') => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	/**
	 * A change handler for the reading direction select, asserting that the value
	 * is either 'ltr' or 'rtl' before setting the reading direction in the book preferences.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (e.target.value === 'ltr' || e.target.value === 'rtl') {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid reading direction: ${e.target.value}`)
			}
		},
		[onChange],
	)

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
				value={direction}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}
