import { Label, NativeSelect } from '@stump/components'
import { ReadingMode } from '@stump/sdk'
import { useCallback } from 'react'

type Props = {
	value: ReadingMode
	onChange: (value: ReadingMode) => void
}

export default function ReadingModeSelect({ value, onChange }: Props) {
	/**
	 * A change handler for the reading mode select, asserting that the value
	 * is a valid {@link ReadingMode} before setting the reading mode in the book preferences.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isReadingMode(e.target.value)) {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid reading mode: ${e.target.value}`)
			}
		},
		[onChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="reading-mode">Flow</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{ label: 'Vertical scroll', value: 'continuous:vertical' },
					{ label: 'Horizontal scroll', value: 'continuous:horizontal' },
					{ label: 'Paged', value: 'paged' },
				]}
				value={value}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

/**
 * A type guard to ensure that the provided string is a valid {@link ReadingMode}.
 */
const isReadingMode = (mode: string): mode is ReadingMode =>
	mode === 'continuous:vertical' || mode === 'continuous:horizontal' || mode === 'paged'
