import { CaseSensitive } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '~/components/ui'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function SentenceCase() {
	const { t } = useTranslate()
	const { locale, preferSentenceCase, patch } = usePreferencesStore(
		useShallow((state) => ({
			locale: state.locale,
			preferSentenceCase: state.sentenceCase,
			patch: state.patch,
		})),
	)

	if (!locale?.startsWith('en-')) return null

	return (
		<AppSettingsRow
			icon={CaseSensitive}
			iconBackgroundColor={SETTINGS_COLORS.interactive}
			title={t('settings.sentenceCase')}
		>
			<Switch
				checked={preferSentenceCase}
				onCheckedChange={(checked) => patch({ sentenceCase: checked })}
			/>
		</AppSettingsRow>
	)
}
