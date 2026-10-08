import { NewCard, RawSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

import { usePreferences } from '@/hooks/usePreferences'
import { useTranslate } from '@/hooks/useTranslate'

export default function EnableFancyAnimations() {
	const { t } = useTranslate()
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
		<NewCard.Row
			label={t(getKey('label'))}
			description={t(getKey('description'))}
			onClick={handleChange}
			className="flex-row items-center justify-between"
		>
			<RawSwitch
				id="enableFancyAnimations"
				checked={enableFancyAnimations}
				onCheckedChange={handleChange}
			/>
		</NewCard.Row>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.enableFancyAnimations'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
