import { Palette } from 'lucide-react-native'
import { useShallow } from 'zustand/react/shallow'

import { ThumbnailPlaceholderType } from '~/components/image/ThumbnailPlaceholder'
import { Picker } from '~/components/ui/picker/picker'
import { useTranslate } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function ThumbnailPlaceholder() {
	const { t } = useTranslate()
	const { thumbnailPlaceholder, patch } = usePreferencesStore(
		useShallow((state) => ({
			thumbnailPlaceholder: state.thumbnailPlaceholder,
			patch: state.patch,
		})),
	)

	return (
		<AppSettingsRow icon={Palette} title={t(getKey('label'))}>
			<Picker<ThumbnailPlaceholderType>
				value={thumbnailPlaceholder}
				options={[
					{
						label: t(getKey('options.grayscale')),
						value: 'grayscale',
					},
					{
						label: t(getKey('options.averageColor')),
						value: 'averageColor',
					},
					{
						label: t(getKey('options.colorful')),
						value: 'colorful',
					},
					{
						label: t(getKey('options.thumbhash')),
						value: 'thumbhash',
					},
				]}
				onValueChange={(value) => patch({ thumbnailPlaceholder: value })}
			/>
		</AppSettingsRow>
	)
}

const LOCALE_BASE = 'settings.preferences.thumbnailPlaceholder'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
