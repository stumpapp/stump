import { NativeSelect } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	value: ReadingMode
	onChange: (value: ReadingMode) => void
}

export default function ReadingModeSelect({ value, onChange }: Props) {
	const { translate } = useTranslate()

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
		<div>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{
						label: translate('shared.readerSettings.readingMode.options.CONTINUOUS_VERTICAL'),
						value: 'CONTINUOUS_VERTICAL',
					},
					{
						label: translate('shared.readerSettings.readingMode.options.CONTINUOUS_HORIZONTAL'),
						value: 'CONTINUOUS_HORIZONTAL',
					},
					{
						label: translate('shared.readerSettings.readingMode.options.PAGED'),
						value: 'PAGED',
					},
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
