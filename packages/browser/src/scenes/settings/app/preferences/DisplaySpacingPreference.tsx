import { NativeSelect, NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

export default function DisplaySpacingPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableCompactDisplay },
		update,
	} = usePreferences()

	const handleChange = async (enable_compact: boolean) => {
		if (enable_compact === enableCompactDisplay) return

		try {
			await update({ enableCompactDisplay: enable_compact })
		} catch (error) {
			console.error(error)
		}
	}

	const selectedOption = enableCompactDisplay ? 'compact' : 'default'

	const options = [
		{ label: t(getKey('options.default')), value: 'default' },
		{ label: t(getKey('options.compact')), value: 'compact', disabled: true },
	]

	return (
		<NewCard.Row label={t(getKey('label'))} description={t(getKey('description'))}>
			<div className="max-w-xs lg:w-56 w-full">
				<NativeSelect
					value={selectedOption}
					options={options}
					onChange={(e) => {
						if (e.target.value === 'compact') return
						return handleChange(false)
					}}
				/>
			</div>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.displaySpacing'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
