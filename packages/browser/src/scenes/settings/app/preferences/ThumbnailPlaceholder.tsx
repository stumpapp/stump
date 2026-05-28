import { NewCard } from '@stump/components'
import { ThumbnailPlaceholderStyle } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks/usePreferences'

import RadioTileGroup from './RadioTileGroup'
import ThumbnailPreviewFrame from './ThumbnailPreviewFrame'

export default function ThumbnailPlaceholder() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailPlaceholderStyle, thumbnailRatio },
		update,
	} = usePreferences()

	const options = [
		{ label: t(getKey('options.grayscale')), value: ThumbnailPlaceholderStyle.Grayscale },
		{ label: t(getKey('options.averageColor')), value: ThumbnailPlaceholderStyle.AverageColor },
		{ label: t(getKey('options.colorful')), value: ThumbnailPlaceholderStyle.Colorful },
		{ label: t(getKey('options.thumbhash')), value: ThumbnailPlaceholderStyle.Thumbhash },
	] satisfies { label: string; value: ThumbnailPlaceholderStyle }[]

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<RadioTileGroup
				value={thumbnailPlaceholderStyle}
				onChange={(value) => update({ thumbnailPlaceholderStyle: value })}
				options={options.map((option) => ({
					label: option.label,
					value: option.value,
					preview: <ThumbnailPreviewFrame style={option.value} ratio={thumbnailRatio} />,
				}))}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.thumbnailPlaceholder'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
