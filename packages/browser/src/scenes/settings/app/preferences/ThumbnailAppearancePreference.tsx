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

	const styleOptions = [
		{
			label: t(getSectionKey('thumbnailPlaceholder', 'options.grayscale')),
			value: ThumbnailPlaceholderStyle.Grayscale,
		},
		{
			label: t(getSectionKey('thumbnailPlaceholder', 'options.averageColor')),
			value: ThumbnailPlaceholderStyle.AverageColor,
		},
		{
			label: t(getSectionKey('thumbnailPlaceholder', 'options.colorful')),
			value: ThumbnailPlaceholderStyle.Colorful,
		},
		{
			label: t(getSectionKey('thumbnailPlaceholder', 'options.thumbhash')),
			value: ThumbnailPlaceholderStyle.Thumbhash,
		},
	]

	const roundnessOptions = [
		{
			label: t(getSectionKey('thumbnailRoundness', 'options.none')),
			value: InterfaceRoundness.None,
		},
		{
			label: t(getSectionKey('thumbnailRoundness', 'options.normal')),
			value: InterfaceRoundness.Normal,
		},
		{
			label: t(getSectionKey('thumbnailRoundness', 'options.rounded')),
			value: InterfaceRoundness.Rounded,
		},
		{
			label: t(getSectionKey('thumbnailRoundness', 'options.large')),
			value: InterfaceRoundness.Pill,
		},
	]

	const closestOption = ratioOptions.reduce((prev, curr) =>
		Math.abs(curr.value - thumbnailRatio) < Math.abs(prev.value - thumbnailRatio) ? curr : prev,
	)

	return (
		<>
			<NewCard.Row
				label={t(getSectionKey('thumbnailPreview', 'label'))}
				description={t(getSectionKey('thumbnailPreview', 'description'))}
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

const LOCALE_BASE = 'settingsScene.app/preferences.sections'
const getSectionKey = (section: string, key: string) => `${LOCALE_BASE}.${section}.${key}`
