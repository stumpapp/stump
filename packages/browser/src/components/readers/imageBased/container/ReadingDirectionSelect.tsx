import { Label, NativeSelect } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

type Props = {
	direction: ReadingDirection
	onChange: (direction: ReadingDirection) => void
}

export default function ReadingDirectionSelect({ direction, onChange }: Props) {
	const { t } = useLocaleContext()

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
		<div className="py-1.5">
			<Label htmlFor="reading-direction">{t('imageReader.settings.readingDirection.label')}</Label>
			<NativeSelect
				id="reading-direction"
				size="sm"
				options={[
					{ label: t('imageReader.settings.readingDirection.options.leftToRight'), value: 'LTR' },
					{ label: t('imageReader.settings.readingDirection.options.rightToLeft'), value: 'RTL' },
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
