import { View } from 'react-native'

import { Text } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { ImageFilter as ImageFilterType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const IMAGE_FILTER_OPTIONS: PickerOption[] = [
	{ label: 'None', value: 'none' },
	{ label: 'Darken', value: 'darken' },
	{ label: 'Invert', value: 'invert' },
]

export default function ImageFilter() {
	const store = useReaderStore((state) => ({
		imageFilter: state.globalSettings.imageFilter,
		setSettings: state.setGlobalSettings,
	}))

	const handleChange = (value: string) => {
		const imageFilter = value === 'none' ? undefined : (value as ImageFilterType)
		store.setSettings({ imageFilter })
	}

	return (
		<View className="flex-row items-center justify-between px-6 py-3">
			<Text className="text-lg text-foreground">Image Filter</Text>
			<Picker
				value={store.imageFilter ?? 'none'}
				options={IMAGE_FILTER_OPTIONS}
				onValueChange={handleChange}
			/>
		</View>
	)
}
