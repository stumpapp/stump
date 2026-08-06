import { Label, NativeSelect } from '@stump/components'
import { ReadingImageScaleFit } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { useCallback } from 'react'

type Props = {
	value: ReadingImageScaleFit
	onChange: (value: ReadingImageScaleFit) => void
}

export default function ImageScalingSelect({ value, onChange }: Props) {
	const { t } = useLocaleContext()
	/**
	 * A change handler for the image scaling select, asserting that the value
	 * is a valid {@link ReadingImageScaleFit} before setting the scaling method
	 * in the book preferences (via the `doChange` callback).
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isBookImageScalingFit(e.target.value)) {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid scaling fit: ${e.target.value}`)
			}
		},
		[onChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="image-scaling-fit">{t('readerUi.imageScaling')}</Label>
			<NativeSelect
				id="image-scaling-fit"
				size="sm"
				options={[
					{ label: t('readerUi.auto'), value: 'AUTO' },
					{ label: t('readerUi.height'), value: 'HEIGHT' },
					{ label: t('readerUi.width'), value: 'WIDTH' },
					{ label: t('readerUi.original'), value: 'NONE' },
				]}
				value={value}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isBookImageScalingFit = (value: string): value is ReadingImageScaleFit =>
	['HEIGHT', 'WIDTH', 'AUTO', 'NONE'].includes(value)
