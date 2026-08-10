import { CaseSensitive } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Picker } from '~/components/ui/picker/picker'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { TextCase } from '~/stores/user'

import AppSettingsRow from '../AppSettingsRow'

export default function TextCasePreference() {
	const { t } = useTranslate()
	const { textCase, patch } = usePreferencesStore(
		useShallow((state) => ({
			textCase: state.textCase,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow
			icon={CaseSensitive}
			iconBackgroundColor={SETTINGS_COLORS.interactive}
			title={t(getKey('label'), { textCase: textCase })}
		>
			<Picker<TextCase>
				value={textCase}
				options={[
					{ label: t(getKey('options.titleCase')), value: 'titleCase' },
					{ label: t(getKey('options.sentenceCase')), value: 'sentenceCase' },
					{ label: t(getKey('options.lowerCase')), value: 'lowerCase' },
				]}
				onValueChange={(value) => patch({ textCase: value })}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.textCase'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
