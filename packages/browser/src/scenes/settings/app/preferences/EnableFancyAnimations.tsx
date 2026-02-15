import { WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks/usePreferences'

export default function EnableFancyAnimations() {
	const { t } = useLocaleContext()
	const {
		preferences: { enableFancyAnimations },
		update,
	} = usePreferences()

	const handleChange = () => {
		update({
			enableFancyAnimations: !enableFancyAnimations,
		})
	}

	return (
		<WideSwitch
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			checked={enableFancyAnimations}
			onCheckedChange={handleChange}
			formId="enableFancyAnimations"
		/>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.enableFancyAnimations'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
