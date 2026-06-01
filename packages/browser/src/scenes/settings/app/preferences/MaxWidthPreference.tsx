import { cx, NativeSelect, NewCard } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks'

export default function MaxWidthPreference() {
	const { t } = useLocaleContext()
	const {
		preferences: { layoutMaxWidthPx, primaryNavigationMode },
		update,
	} = usePreferences()

	const options = [
		{ label: t(getKey('options.noLimit')), value: 0 },
		{ label: '1152px', value: 1152 },
		{ label: '1280px', value: 1280 },
		{ label: '1440px', value: 1440 },
		{ label: '1600px', value: 1600 },
		{ label: '1920px', value: 1920 },
	]

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value

		if (!value) {
			return update({ layoutMaxWidthPx: null })
		}

		// TODO: support custom
		const parsed = parseInt(value)
		if (!isNaN(parsed) && options.some((opt) => opt.value === parsed)) {
			return update({ layoutMaxWidthPx: parsed })
		}

		return null
	}

	const isSidebarMode = primaryNavigationMode === 'SIDEBAR'

	return (
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			className={cx({ 'opacity-50': isSidebarMode })}
		>
			<div
				className="max-w-xs lg:w-56 w-full"
				title={isSidebarMode ? t(getKey('tooltip')) : undefined}
			>
				<NativeSelect
					value={layoutMaxWidthPx || undefined}
					options={options}
					onChange={handleChange}
					disabled={isSidebarMode}
				/>
			</div>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.maxWidthPreference'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
