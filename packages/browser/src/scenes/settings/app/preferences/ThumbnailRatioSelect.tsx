import { NewCard } from '@stump/components'
import { ThumbnailPlaceholderStyle } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

import RadioTileGroup from './RadioTileGroup'
import ThumbnailPreviewFrame from './ThumbnailPreviewFrame'

export default function ThumbnailRatioSelect() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailRatio, thumbnailPlaceholderStyle },
		update,
	} = usePreferences()

	const options = [
		{ label: '1 : 1.6', value: 1 / 1.6 },
		{ label: `1 : 1.5 (${t(getKey('defaultSuffix'))})`, value: 1 / 1.5 },
		{ label: '1 : √2', value: 1 / 1.414 },
	]

	// Sidestep any precision issues with the stored thumbnailRatio value
	const closestOption = options.reduce((prev, curr) =>
		Math.abs(curr.value - thumbnailRatio) < Math.abs(prev.value - thumbnailRatio) ? curr : prev,
	)

	const currentStyle = thumbnailPlaceholderStyle || ThumbnailPlaceholderStyle.Grayscale

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<RadioTileGroup
				value={closestOption.value}
				onChange={(value) => update({ thumbnailRatio: Number(value) })}
				columns={3}
				options={options.map((option) => ({
					label: option.label,
					value: option.value,
					preview: <ThumbnailPreviewFrame style={currentStyle} ratio={option.value} />,
				}))}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.thumbnailRatioSelect'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
