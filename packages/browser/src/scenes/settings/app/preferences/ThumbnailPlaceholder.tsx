import { Label, NativeSelect, Text } from '@stump/components'
import { ThumbnailPlaceholderStyle } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import React from 'react'

import { usePreferences } from '@/hooks/usePreferences'

export default function ThumbnailPlaceholder() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailPlaceholderStyle },
		update,
	} = usePreferences()

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!isPlaceholderStyle(e.target.value)) return
		return update({ thumbnailPlaceholderStyle: e.target.value })
	}

	const options = [
		{ label: t(getKey('options.grayscale')), value: ThumbnailPlaceholderStyle.Grayscale },
		{ label: t(getKey('options.averageColor')), value: ThumbnailPlaceholderStyle.AverageColor },
		{ label: t(getKey('options.colorful')), value: ThumbnailPlaceholderStyle.Colorful },
		{ label: t(getKey('options.thumbhash')), value: ThumbnailPlaceholderStyle.Thumbhash },
	] satisfies { label: string; value: ThumbnailPlaceholderStyle }[]

	return (
		<div className="flex flex-col gap-y-1.5 md:max-w-md">
			<Label>{t(getKey('label'))}</Label>
			<NativeSelect value={thumbnailPlaceholderStyle} options={options} onChange={handleChange} />
			<Text size="xs" variant="muted">
				{t(getKey('description'))}
			</Text>
		</div>
	)
}

const isPlaceholderStyle = (value: string): value is ThumbnailPlaceholderStyle => {
	return Object.values(ThumbnailPlaceholderStyle).includes(value as ThumbnailPlaceholderStyle)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.thumbnailPlaceholder'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
