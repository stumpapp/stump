import { Label, NativeSelect, Text } from '@stump/components'
import { ThumbnailPlaceholderStyle } from '@stump/graphql'
import React from 'react'

import { usePreferences } from '@/hooks/usePreferences'

const OPTIONS = [
	{ label: 'Grayscale', value: ThumbnailPlaceholderStyle.Grayscale },
	{ label: 'Average color', value: ThumbnailPlaceholderStyle.AverageColor },
	{ label: 'Colorful', value: ThumbnailPlaceholderStyle.Colorful },
	{ label: 'Thumbhash', value: ThumbnailPlaceholderStyle.Thumbhash },
] satisfies { label: string; value: ThumbnailPlaceholderStyle }[]

export default function ThumbnailPlaceholder() {
	const {
		preferences: { thumbnailPlaceholderStyle },
		update,
	} = usePreferences()

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!isPlaceholderStyle(e.target.value)) return
		return update({ thumbnailPlaceholderStyle: e.target.value })
	}

	return (
		<div className="flex flex-col gap-y-1.5 md:max-w-md">
			<Label>Thumbnail placeholder</Label>
			<NativeSelect value={thumbnailPlaceholderStyle} options={OPTIONS} onChange={handleChange} />
			<Text size="xs" variant="muted">
				The style to use for thumbnail placeholders
			</Text>
		</div>
	)
}

const isPlaceholderStyle = (value: string): value is ThumbnailPlaceholderStyle => {
	return Object.values(ThumbnailPlaceholderStyle).includes(value as ThumbnailPlaceholderStyle)
}
