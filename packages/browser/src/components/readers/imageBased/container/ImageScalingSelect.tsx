import { BookImageScalingMethod } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import React, { useCallback } from 'react'

type Props = {
	variant: 'height' | 'width'
	onChange: (value: BookImageScalingMethod) => void
	value: BookImageScalingMethod
}

export default function ImageScalingSelect({ onChange, variant, value }: Props) {
	/**
	 * A change handler for the image scaling select, asserting that the value
	 * is a valid {@link BookImageScalingMethod} before setting the scaling method
	 * in the book preferences (via the `onChange` callback).
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isBookImageScalingMethod(e.target.value)) {
				onChange(e.target.value)
			} else {
				console.warn(`Invalid scaling method: ${e.target.value}`)
			}
		},
		[onChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor={`${variant}-scaling`}>{variant}</Label>
			<NativeSelect
				id={`${variant}-scaling`}
				size="sm"
				options={[
					{ label: 'Auto', value: 'auto' },
					{ label: 'Fill', value: 'fill' },
					{ label: 'None', value: 'none' },
				]}
				value={value}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isBookImageScalingMethod = (value: string): value is BookImageScalingMethod =>
	['auto', 'fill', 'none'].includes(value)
