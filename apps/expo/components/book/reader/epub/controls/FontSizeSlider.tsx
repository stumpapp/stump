import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { View } from 'react-native'

import { Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useReaderStore } from '~/stores/reader'

export default function FontSizeSlider() {
	const colors = useColors()

	const store = useReaderStore((state) => ({
		fontSize: state.globalSettings.fontSize,
		setFontSize: state.setGlobalSettings,
	}))

	const [value, setValue] = useState(() => sizeToScale(store.fontSize || 16))

	const handleSliderComplete = (val: number) => {
		const newSize = scaleToSize(val)
		setValue(val)
		store.setFontSize({ fontSize: newSize })
	}

	return (
		<View className="flex-1">
			<Text>Size</Text>

			<Slider
				style={{ width: '100%', height: 40 }}
				minimumValue={1}
				maximumValue={15}
				value={value}
				minimumTrackTintColor={colors.edge.DEFAULT}
				maximumTrackTintColor={colors.edge.DEFAULT}
				step={1}
				onValueChange={(value) => {
					setValue(value)
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
				}}
				onSlidingComplete={handleSliderComplete}
			/>
		</View>
	)
}

const scaleToSize = (scale: number) => {
	return 8 + (scale - 1) * (24 / 14)
}

const sizeToScale = (size: number) => {
	return 1 + (size - 8) * (14 / 24)
}
