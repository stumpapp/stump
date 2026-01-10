import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { Sun, SunDim } from 'lucide-react-native'
import { useCallback } from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { useColors } from '~/lib/constants'
import { useReaderStore } from '~/stores'

// TODO: Fancy and scale on focus/drag
export default function Brightness() {
	const colors = useColors()

	const store = useReaderStore((state) => ({
		brightness: state.globalSettings.brightness,
		setSettings: state.setGlobalSettings,
	}))

	const onValueChange = useCallback(
		(value: number) => {
			if (value === store.brightness) return
			if (value < 0.1) return
			store.setSettings({ brightness: value })
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[store.brightness],
	)

	return (
		<View className="max-w-full flex-row items-center gap-3 px-6">
			<Icon as={SunDim} className="h-4 w-4 shrink-0 text-foreground-muted" />
			<View className="flex-1">
				<Slider
					style={{ width: '100%', height: 40 }}
					minimumValue={0}
					maximumValue={1}
					value={store.brightness}
					minimumTrackTintColor={colors.edge.DEFAULT}
					maximumTrackTintColor={colors.edge.DEFAULT}
					step={0.1}
					onValueChange={(value) => {
						onValueChange(value)
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
					}}
				/>
			</View>
			<Icon as={Sun} className="h-4 w-4 shrink-0 text-foreground-muted" />
		</View>
	)
}
