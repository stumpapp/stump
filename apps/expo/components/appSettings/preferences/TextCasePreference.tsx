import { CaseSensitive } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Picker } from '~/components/ui/picker/picker'
import { SETTINGS_COLORS } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'
import { TextCase } from '~/stores/user'

import AppSettingsRow from '../AppSettingsRow'

export default function TextCasePreference() {
	const { translate } = useTranslate()
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
			title={translate(getKey('label'), { textCase: textCase })}
		>
			<Picker<TextCase>
				value={textCase}
				options={[
					{ label: translate(getKey('options.titleCase')), value: 'titleCase' },
					{ label: translate(getKey('options.sentenceCase')), value: 'sentenceCase' },
					{ label: translate(getKey('options.lowerCase')), value: 'lowerCase' },
				]}
				onValueChange={(value) => patch({ textCase: value })}
			/>
		</AppSettingsRow>
	)
}

const getKey = (key: string) => `shared.textCase.${key}`
