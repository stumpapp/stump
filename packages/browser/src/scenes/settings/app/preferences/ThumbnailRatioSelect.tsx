import { Label, NativeSelect, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

const OPTIONS = [
	{ label: '1 : 1.6', value: 1 / 1.6 },
	{ label: '1 : 1.5 (Default)', value: 1 / 1.5 },
	{ label: '1 : √2', value: 1 / 1.414 },
]

export default function ThumbnailRatioSelect() {
	const { t } = useLocaleContext()
	const {
		preferences: { thumbnailRatio },
		update,
	} = usePreferences()

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value
		return update({ thumbnailRatio: Number(value) })
	}

	// Sidestep any precision issues with the stored thumbnailRatio value
	const closestOption = OPTIONS.reduce((prev, curr) =>
		Math.abs(curr.value - thumbnailRatio) < Math.abs(prev.value - thumbnailRatio) ? curr : prev,
	)

	return (
		<div className="flex flex-col gap-y-1.5 md:max-w-md">
			<Label>{t(getKey('label'))}</Label>
			<NativeSelect value={closestOption.value} options={OPTIONS} onChange={handleChange} />
			<Text size="xs" variant="muted">
				{t(getKey('description'))}
			</Text>
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.thumbnailRatioSelect'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
