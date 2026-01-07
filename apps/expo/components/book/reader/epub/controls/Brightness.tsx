import Slider from '@react-native-community/slider'
import * as ExpoBrightness from 'expo-brightness'
import { Sun, SunDim } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { useColors } from '~/lib/constants'
import { useAppState } from '~/lib/hooks'

// TODO: Fancy and scale on focus/drag
export default function Brightness() {
	const colors = useColors()

	const [brightness, setBrightness] = useState<number>()

	const syncBrightness = useCallback(async () => {
		const currentBrightness = await ExpoBrightness.getSystemBrightnessAsync()
		setBrightness(currentBrightness)
	}, [])

	useEffect(() => {
		;(async () => {
			const { status } = await ExpoBrightness.requestPermissionsAsync()
			if (status === 'granted') {
				syncBrightness()
			}
		})()
	}, [syncBrightness])

	const onFocusedChanged = useCallback(
		(focused: boolean) => {
			if (focused) {
				syncBrightness()
			}
		},
		[syncBrightness],
	)

	useAppState({ onStateChanged: onFocusedChanged })

	return (
		<View className="max-w-full flex-row items-center gap-3 px-4">
			<Icon as={SunDim} className="h-6 w-6 shrink-0 text-foreground-muted" />
			<View className="flex-1">
				<Slider
					style={{ width: '100%', height: 30 }}
					minimumValue={0}
					maximumValue={1}
					value={brightness}
					minimumTrackTintColor={colors.slider.minimumTrack}
					maximumTrackTintColor={colors.slider.maximumTrack}
					onValueChange={ExpoBrightness.setSystemBrightnessAsync}
				/>
			</View>
			<Icon as={Sun} className="h-6 w-6 shrink-0 text-foreground-muted" />
		</View>
	)
}
