import { Ruler } from 'lucide-react-native'

import { Picker } from '~/components/ui/picker/picker'
import { usePreferencesStore } from '~/stores'

import AppSettingsRow from '../AppSettingsRow'

export default function ThumbnailRatio() {
	const { thumbnailRatio, patch } = usePreferencesStore((state) => ({
		thumbnailRatio: state.thumbnailRatio,
		patch: state.patch,
	}))

	const ratioToStringMap: Record<number, string> = {
		[5 / 8]: '1 : 1.6',
		[2 / 3]: '1 : 1.5',
		[1 / 1.42]: '1 : √2',
	}
	const stringToRatioMap: Record<string, number> = {
		'1 : 1.6': 5 / 8,
		'1 : 1.5': 2 / 3,
		'1 : √2': 1 / 1.42,
	}
	const thumbnailRatioName = ratioToStringMap[thumbnailRatio]

	return (
		<AppSettingsRow icon={Ruler} title="Thumbnail Ratio">
			<Picker
				value={thumbnailRatioName || '1 : 1.5'}
				options={[
					{
						label: '1 : 1.6',
						value: '1 : 1.6',
					},
					{
						label: '1 : 1.5 (Default)',
						value: '1 : 1.5',
					},
					{
						label: '1 : √2',
						value: '1 : √2',
					},
				]}
				onValueChange={(value) => {
					const ratio = stringToRatioMap[value]
					if (ratio != null) {
						patch({ thumbnailRatio: ratio })
					}
				}}
			/>
		</AppSettingsRow>
	)
}
