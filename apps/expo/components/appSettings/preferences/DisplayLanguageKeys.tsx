import { Globe } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { DisplayLanguageKeysType } from '~/stores/user'

import AppSettingsRow from '../AppSettingsRow'

export default function DisplayLanguageKeys() {
	const { t } = useTranslate()
	const { displayLanguageKeys, patch } = usePreferencesStore(
		useShallow((state) => ({
			displayLanguageKeys: state.displayLanguageKeys,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow icon={Globe} title={t(getKey('label'))}>
			<Picker<DisplayLanguageKeysType>
				value={displayLanguageKeys}
				options={[
					{
						label: t(getKey('options.none')),
						value: 'none',
					},
					{
						label: t(getKey('options.abbreviated')),
						value: 'abbreviated',
					},
					{
						label: t(getKey('options.full')),
						value: 'full',
					},
				]}
				onValueChange={(value) => patch({ displayLanguageKeys: value })}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.debug.displayLanguageKeys'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
