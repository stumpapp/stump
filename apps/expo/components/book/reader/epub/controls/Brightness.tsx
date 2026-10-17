import Slider from '@react-native-community/slider'
import * as ExpoBrightness from 'expo-brightness'
import { Sun, SunDim } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useAppState } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'

type BrightnessProps = {
	isSheetOpen: boolean
	setTouchingSlider: React.Dispatch<React.SetStateAction<boolean>>
}

// TODO: Fancy and scale on focus/drag
export default function Brightness({ isSheetOpen, setTouchingSlider }: BrightnessProps) {
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

	const [brightness, setBrightness] = useState<number>()

	const syncBrightness = useCallback(async () => {
		const { status } = await ExpoBrightness.getPermissionsAsync()
		if (status === ExpoBrightness.PermissionStatus.DENIED) return
		// i think getSystemBrightnessAsync will auto-request if they haven't been granted, at least that
		// is what it seems to do based on testing. if i deny the permission, i do not want it
		// prompting me each time i open the sheet
		const currentBrightness = await ExpoBrightness.getSystemBrightnessAsync()
		setBrightness(currentBrightness)
	}, [])

	useEffect(
		() => {
			syncBrightness()
		},
		// so there exists https://docs.expo.dev/versions/latest/sdk/brightness/#event-subscriptions but OF COURSE it is
		// iOS only >:( so i've added a workaround to re-sync whenever the sheet state changes. it's far from ideal, but
		// it works well enough i guess
		[syncBrightness, isSheetOpen],
	)

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
					onTouchStart={() => setTouchingSlider(true)}
					onTouchEnd={() => setTouchingSlider(false)}
				/>
			</View>
			<Icon as={Sun} className="h-6 w-6 text-foreground-muted shrink-0" />
		</View>
	)
}
