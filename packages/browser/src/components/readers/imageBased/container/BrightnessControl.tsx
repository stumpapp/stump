import { Label, Slider } from '@stump/components'
import React, { useCallback, useMemo } from 'react'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'

export default function BrightnessControl() {
	const { book } = useImageBaseReaderContext()
	const {
		bookPreferences: { brightness },
		setBookPreferences,
	} = useBookPreferences({ book })

	const handleChange = useCallback(
		(value?: number) => {
			if (value === undefined || isNaN(value)) return
			setBookPreferences({ brightness: value })
		},
		[setBookPreferences],
	)

	const value = useMemo(() => (isNaN(brightness) ? 1 : brightness), [brightness])

	return (
		<div className="flex flex-col space-y-2 py-1.5">
			<Label>Brightness</Label>
			<Slider
				value={[value]}
				step={0.01}
				max={1}
				onValueChange={([dragValue]) => handleChange(dragValue)}
			/>
		</div>
	)
}
