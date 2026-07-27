import Slider from '@react-native-community/slider'
import * as ExpoBrightness from 'expo-brightness'
import { Sun, SunDim } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useAppState } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

// TODO: Fancy and scale on focus/drag
export default function Brightness() {
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

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
		<View className="gap-3 px-4 max-w-full flex-row items-center">
			<Icon as={SunDim} className="h-6 w-6 text-foreground-muted shrink-0" />
			<View className="flex-1">
				<Slider
					style={{ width: '100%', height: 30 }}
					minimumValue={0}
					maximumValue={1}
					value={brightness}
					minimumTrackTintColor={colors.slider.minimumTrack}
					maximumTrackTintColor={
						IS_IOS_26_PLUS
							? isDarkColorScheme
								? 'rgba(0 0 0 / 0.3)'
								: 'rgba(0 0 0 / 0.15)'
							: colors.slider.maximumTrack
					}
					onValueChange={(value) => {
						setBrightness(value)
						ExpoBrightness.setSystemBrightnessAsync(value)
					}}
				/>
			</View>
			<Icon as={Sun} className="h-6 w-6 text-foreground-muted shrink-0" />
		</View>
	)
}
