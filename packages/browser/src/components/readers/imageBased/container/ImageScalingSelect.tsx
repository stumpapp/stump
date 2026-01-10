import { Label, NativeSelect } from '@stump/components'
import { ReadingImageScaleFit } from '@stump/graphql'
import { useCallback } from 'react'

type Props = {
	value: ReadingImageScaleFit
	onChange: (value: ReadingImageScaleFit) => void
}

export default function ImageScalingSelect({ value, onChange }: Props) {
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
			<Label htmlFor="image-scaling-fit">Image scaling</Label>
			<NativeSelect
				id="image-scaling-fit"
				size="sm"
				options={[
					{ label: 'Auto', value: 'AUTO' },
					{ label: 'Height', value: 'HEIGHT' },
					{ label: 'Width', value: 'WIDTH' },
					{ label: 'Original', value: 'NONE' },
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
