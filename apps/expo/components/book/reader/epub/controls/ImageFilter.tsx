import { View } from 'react-native'

import { Heading, Label, RadioGroup, RadioGroupItem } from '~/components/ui'
import { ImageFilter as ImageFilterType } from '~/modules/readium'
import { useReaderStore } from '~/stores'

const IMAGE_FILTER_OPTIONS: { label: string; value: ImageFilterType | 'none' }[] = [
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
		<View className="gap-2">
			<Heading className="pl-4">Image Filter</Heading>

			<View className="px-6">
				<RadioGroup
					value={store.imageFilter ?? 'none'}
					onValueChange={handleChange}
					className="flex-row gap-6"
				>
					{IMAGE_FILTER_OPTIONS.map((option) => (
						<View key={option.value} className="flex-row items-center gap-2">
							<RadioGroupItem value={option.value} />
							<Label htmlFor={option.value}>{option.label}</Label>
						</View>
					))}
				</RadioGroup>
			</View>
		</View>
	)
}
