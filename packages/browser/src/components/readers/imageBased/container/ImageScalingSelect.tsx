import { BookImageScalingFit } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import { useCallback } from 'react'

type Props = {
	value: BookImageScalingFit
	onChange: (value: BookImageScalingFit) => void
}

export default function ImageScalingSelect({ value, onChange }: Props) {
	/**
	 * A change handler for the image scaling select, asserting that the value
	 * is a valid {@link BookImageScalingFit} before setting the scaling method
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
					{ label: 'Auto', value: 'auto' },
					{ label: 'Height', value: 'height' },
					{ label: 'Width', value: 'width' },
					{ label: 'Original', value: 'none' },
				]}
				value={value}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isBookImageScalingFit = (value: string): value is BookImageScalingFit =>
	['height', 'width', 'auto', 'none'].includes(value)
