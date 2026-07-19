import { NewCard } from '@stump/components'
import { InterfaceRoundness } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

import RadioTileGroup from './RadioTileGroup'

export default function InterfaceRoundnessPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { interfaceRoundness },
		update,
	} = usePreferences()

	const handleChange = async (value: InterfaceRoundness) => {
		if (value === interfaceRoundness) return

		try {
			await update({ interfaceRoundness: value })
		} catch (error) {
			console.error(error)
		}
	}

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<RadioTileGroup
				value={interfaceRoundness || InterfaceRoundness.Normal}
				onChange={handleChange}
				columns={4}
				options={[
					{
						label: t(getKey('options.none')),
						value: InterfaceRoundness.None,
						preview: <RoundnessPreview value={InterfaceRoundness.None} />,
					},
					{
						label: t(getKey('options.normal')),
						value: InterfaceRoundness.Normal,
						preview: <RoundnessPreview value={InterfaceRoundness.Normal} />,
					},
					{
						label: t(getKey('options.rounded')),
						value: InterfaceRoundness.Rounded,
						preview: <RoundnessPreview value={InterfaceRoundness.Rounded} />,
					},
					{
						label: t(getKey('options.pill')),
						value: InterfaceRoundness.Pill,
						preview: <RoundnessPreview value={InterfaceRoundness.Pill} />,
					},
				]}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.interfaceRoundness'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const ROUNDNESS_PREVIEW_RADIUS: Record<InterfaceRoundness, number> = {
	[InterfaceRoundness.None]: 0,
	[InterfaceRoundness.Normal]: 10,
	[InterfaceRoundness.Rounded]: 14,
	[InterfaceRoundness.Pill]: 18,
}

function RoundnessPreview({ value }: { value?: InterfaceRoundness | null }) {
	const current = value || InterfaceRoundness.Normal

	return (
		<div className="flex h-full w-full items-center justify-center">
			<div
				className="h-7 shadow-sm w-4/5 border border-foreground/45 bg-foreground/90"
				style={{ borderRadius: ROUNDNESS_PREVIEW_RADIUS[current] }}
			/>
		</div>
	)
}
