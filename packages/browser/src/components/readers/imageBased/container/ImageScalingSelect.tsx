import { NativeSelect } from '@stump/components'
import { ReadingImageScaleFit } from '@stump/graphql'
import { useCallback } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	value: ReadingImageScaleFit
	onChange: (value: ReadingImageScaleFit) => void
}

export default function ImageScalingSelect({ value, onChange }: Props) {
	const { translate } = useTranslate()

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
		<div>
			<NativeSelect
				id="image-scaling-fit"
				size="sm"
				options={[
					{
						label: translate('shared.readerSettings.imageScaling.options.AUTO'),
						value: 'AUTO',
					},
					{ label: translate('shared.readerSettings.imageScaling.options.HEIGHT'), value: 'HEIGHT' },
					{ label: translate('shared.readerSettings.imageScaling.options.WIDTH'), value: 'WIDTH' },
					{ label: translate('shared.readerSettings.imageScaling.options.NONE'), value: 'NONE' },
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
