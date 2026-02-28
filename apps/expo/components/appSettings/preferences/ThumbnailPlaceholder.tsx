import { Palette } from 'lucide-react-native'

import { ThumbnailPlaceholderType } from '~/components/image/ThumbnailPlaceholder'
import { Picker } from '~/components/ui/picker/picker'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

// TODO(android): Use non-native dropdown

export default function ThumbnailPlaceholder() {
	const { thumbnailPlaceholder, patch } = usePreferencesStore((state) => ({
		thumbnailPlaceholder: state.thumbnailPlaceholder,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow icon={Palette} title="Thumbnail Placeholder">
			<Picker<ThumbnailPlaceholderType>
				value={thumbnailPlaceholder}
				options={[
					{
						label: 'Grayscale',
						value: 'grayscale',
					},
					{
						label: 'Average Color',
						value: 'averageColor',
					},
					{
						label: 'Colorful',
						value: 'colorful',
					},
					{
						label: 'Thumbhash',
						value: 'thumbhash',
					},
				]}
				onValueChange={(value) => patch({ thumbnailPlaceholder: value })}
			/>
		</AppSettingsRow>
	)
}
