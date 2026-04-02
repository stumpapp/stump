import { Maximize } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function ThumbnailResizeMode() {
	const { t } = useTranslate()
	const { thumbnailResizeMode, patch } = usePreferencesStore(
		useShallow((state) => ({
			thumbnailResizeMode: state.thumbnailResizeMode,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow icon={Maximize} title={t(getKey('label'))}>
			<Picker
				value={thumbnailResizeMode || 'cover'}
				options={(['cover', 'stretch', 'fit'] as const).map((value) => ({
					label: t(getKey(`options.${value}`)),
					value,
				}))}
				onValueChange={(value) => patch({ thumbnailResizeMode: value })}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.preferences.thumbnailResizeMode'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
