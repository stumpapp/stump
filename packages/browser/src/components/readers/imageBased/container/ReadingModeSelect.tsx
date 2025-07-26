import { Label, NativeSelect } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
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
					{ label: 'Vertical scroll', value: 'CONTINUOUS_VERTICAL' },
					{ label: 'Horizontal scroll', value: 'CONTINUOUS_HORIZONTAL' },
					{ label: 'Paged', value: 'PAGED' },
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
	mode === ReadingMode.Paged ||
	mode === ReadingMode.ContinuousHorizontal ||
	mode === ReadingMode.ContinuousVertical
