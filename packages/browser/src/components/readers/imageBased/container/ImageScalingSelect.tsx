import { BookImageScalingFit } from '@stump/client'
import { Label, NativeSelect } from '@stump/components'
import React, { useCallback } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function ImageScalingSelect() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: {
			imageScaling: { scaleToFit },
		},
		setBookPreferences,
	} = useBookPreferences({ book })

	const doChange = useCallback(
		(value: BookImageScalingFit) =>
			setBookPreferences({
				imageScaling: {
					scaleToFit: value,
				},
			}),
		[setBookPreferences],
	)

	/**
	 * A change handler for the image scaling select, asserting that the value
	 * is a valid {@link BookImageScalingFit} before setting the scaling method
	 * in the book preferences (via the `doChange` callback).
	 */
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			if (isBookImageScalingFit(e.target.value)) {
				doChange(e.target.value)
			} else {
				console.warn(`Invalid scaling fit: ${e.target.value}`)
			}
		},
		[doChange],
	)

	return (
		<div className="py-1.5">
			<Label htmlFor="image-scaling-fit">Image scaling</Label>
			<NativeSelect
				id="image-scaling-fit"
				size="sm"
				options={[
					{ label: 'Height', value: 'height' },
					{ label: 'Width', value: 'width' },
					{ label: 'Original', value: 'none' },
				]}
				value={scaleToFit}
				onChange={handleChange}
				className="mt-1.5"
			/>
		</div>
	)
}

const isBookImageScalingFit = (value: string): value is BookImageScalingFit =>
	['height', 'width', 'none'].includes(value)
