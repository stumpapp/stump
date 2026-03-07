import { Maximize } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function ThumbnailResizeMode() {
	const { thumbnailResizeMode, patch } = usePreferencesStore((state) => ({
		thumbnailResizeMode: state.thumbnailResizeMode,
		patch: state.patch,
	}))

	return (
		<AppSettingsRow icon={Maximize} title="Thumbnail Resize">
			<Picker
				value={thumbnailResizeMode || 'cover'}
				options={(['cover', 'stretch', 'fit'] as const).map((value) => ({
					label: getLabel(value),
					value,
				}))}
				onValueChange={(value) => patch({ thumbnailResizeMode: value })}
			/>
		</AppSettingsRow>
	)
}

const LABELS = {
	cover: 'Cover',
	stretch: 'Stretch',
	fit: 'Fit',
}

const getLabel = (key: keyof typeof LABELS) => {
	return LABELS[key] || 'Cover'
}
