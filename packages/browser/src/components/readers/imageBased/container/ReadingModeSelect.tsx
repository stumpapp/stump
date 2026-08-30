import { Label, NativeSelect } from '@stump/components'
import { ReadingMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

type Props = {
	value: ReadingMode
	onChange: (value: ReadingMode) => void
}

export default function ReadingModeSelect({ value, onChange }: Props) {
	const { t } = useLocaleContext()

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
			<Label htmlFor="reading-mode">{t('imageReader.settings.readingMode.label')}</Label>
			<NativeSelect
				id="reading-mode"
				size="sm"
				options={[
					{
						label: t('imageReader.settings.readingMode.options.verticalScroll'),
						value: 'CONTINUOUS_VERTICAL',
					},
					{
						label: t('imageReader.settings.readingMode.options.horizontalScroll'),
						value: 'CONTINUOUS_HORIZONTAL',
					},
					{ label: t('imageReader.settings.readingMode.options.paged'), value: 'PAGED' },
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
