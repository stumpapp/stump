import { NativeSelect, NewCard } from '@stump/components'
import { InterfaceRoundness, ThumbnailPlaceholderStyle } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

import ThumbnailPreviewFrame from './ThumbnailPreviewFrame'

export default function ThumbnailAppearancePreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailRatio, thumbnailPlaceholderStyle, thumbnailRoundness },
		update,
	} = usePreferences()

	const currentStyle = thumbnailPlaceholderStyle || ThumbnailPlaceholderStyle.Grayscale
	const currentRoundness = thumbnailRoundness || InterfaceRoundness.Normal

	const ratioOptions = [
		{ label: '1 : 1.6', value: 1 / 1.6 },
		{
			label: `1 : 1.5 (${t(getSectionKey('thumbnailRatioSelect', 'defaultSuffix'))})`,
			value: 1 / 1.5,
		},
		{ label: '1 : √2', value: 1 / 1.414 },
	]

	const closestOption = ratioOptions.reduce((prev, curr) =>
		Math.abs(curr.value - thumbnailRatio) < Math.abs(prev.value - thumbnailRatio) ? curr : prev,
	)

	return (
		<>
			<NewCard.Row
				label="Preview"
				description="This is how thumbnails will look with the current settings"
			>
				<div className="lg:w-auto lg:justify-end flex w-full justify-center">
					<div className="h-28 max-w-36 w-full">
						<ThumbnailPreviewFrame style={currentStyle} ratio={thumbnailRatio} />
					</div>
				</div>
			</NewCard.Row>

			<NewCard.Row
				label={t(getSectionKey('thumbnailRatioSelect', 'label'))}
				description={t(getSectionKey('thumbnailRatioSelect', 'description'))}
			>
				<div className="max-w-xs lg:w-56 w-full">
					<NativeSelect
						value={closestOption.value}
						options={ratioOptions}
						onChange={(e) => update({ thumbnailRatio: Number(e.target.value) })}
					/>
				</div>
			</NewCard.Row>

			<NewCard.Row
				label={t(getSectionKey('thumbnailPlaceholder', 'label'))}
				description={t(getSectionKey('thumbnailPlaceholder', 'description'))}
			>
				<div className="max-w-xs lg:w-56 w-full">
					<NativeSelect
						value={currentStyle}
						options={styleOptions}
						onChange={(e) =>
							update({ thumbnailPlaceholderStyle: e.target.value as ThumbnailPlaceholderStyle })
						}
					/>
				</div>
			</NewCard.Row>

			<NewCard.Row
				label={t(getSectionKey('thumbnailRoundness', 'label'))}
				description={t(getSectionKey('thumbnailRoundness', 'description'))}
			>
				<div className="max-w-xs lg:w-56 w-full">
					<NativeSelect
						value={currentRoundness}
						options={roundnessOptions}
						onChange={(e) => update({ thumbnailRoundness: e.target.value as InterfaceRoundness })}
					/>
				</div>
			</NewCard.Row>
		</>
	)
}

const styleOptions = [
	{ label: 'Grayscale', value: ThumbnailPlaceholderStyle.Grayscale },
	{ label: 'Average color', value: ThumbnailPlaceholderStyle.AverageColor },
	{ label: 'Colorful', value: ThumbnailPlaceholderStyle.Colorful },
	{ label: 'Thumbhash', value: ThumbnailPlaceholderStyle.Thumbhash },
]

const roundnessOptions = [
	{ label: 'None', value: InterfaceRoundness.None },
	{ label: 'Normal', value: InterfaceRoundness.Normal },
	{ label: 'Rounded', value: InterfaceRoundness.Rounded },
	{ label: 'Large', value: InterfaceRoundness.Pill },
]

const LOCALE_BASE = 'settingsScene.app/preferences.sections'
const getSectionKey = (section: string, key: string) => `${LOCALE_BASE}.${section}.${key}`
