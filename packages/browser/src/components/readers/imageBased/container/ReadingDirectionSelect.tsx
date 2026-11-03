import { NativeSelect } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	direction: ReadingDirection
	onChange: (direction: ReadingDirection) => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	const { translate } = useTranslate()

	/**
	 * A change handler for the reading direction select, asserting that the value
	 * is either 'ltr' or 'rtl' before setting the reading direction in the book preferences.
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isReadingDirection(e.target.value)) {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid reading direction: ${e.target.value}`)
			}
		},
		[onChange],
	)

	return (
		<div>
			<NativeSelect
				id="reading-direction"
				size="sm"
				options={[
					{
						label: translate('shared.readerSettings.readingDirection.options.LTR'),
						value: 'LTR',
					},
					{
						label: translate('shared.readerSettings.readingDirection.options.RTL'),
						value: 'RTL',
					},
				]}
				value={direction}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isReadingDirection = (value: string): value is ReadingDirection =>
	value === ReadingDirection.Ltr || value === ReadingDirection.Rtl
