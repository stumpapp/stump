import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { Heading, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useReaderStore } from '~/stores'

export default function PageMargins() {
	const colors = useColors()

	const store = useReaderStore((state) => ({
		pageMargins: state.globalSettings.pageMargins ?? 1.0,
		setSettings: state.setGlobalSettings,
	}))

	const [value, setValue] = useState(() => store.pageMargins)

	const handleSliderComplete = useCallback(
		(val: number) => {
			setValue(val)
			store.setSettings({ pageMargins: val })
		},
		[store],
	)

	const displayValue = Math.round(value * 100)

	return (
		<View className="gap-2">
			<Heading className="pl-4">Page Margins</Heading>

			<View className="flex-row items-center gap-2 px-6">
				<Text className="w-12 text-foreground-muted">{displayValue}%</Text>
				<View className="flex-1">
					<Slider
						style={{ width: '100%', height: 40 }}
						minimumValue={0.5}
						maximumValue={2.0}
						value={value}
						minimumTrackTintColor={colors.edge.DEFAULT}
						maximumTrackTintColor={colors.edge.DEFAULT}
						step={0.1}
						onValueChange={(val) => {
							setValue(val)
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
						}}
						onSlidingComplete={handleSliderComplete}
					/>
				</View>
			</View>
		</View>
	)
}
