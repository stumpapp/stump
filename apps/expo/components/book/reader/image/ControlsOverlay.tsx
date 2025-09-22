import { Fragment, useEffect, useState } from 'react'
import { Easing, Pressable } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'

import { easeGradient } from 'react-native-easing-gradient'
import Footer from './Footer'
import Header from './Header'
import ImageReaderGlobalSettingsDialog from './ImageReaderGlobalSettingsDialog'

// TODO: support setting custom gradient colors

export default function ControlsOverlay() {
	const controls = useReaderStore((state) => ({
		isVisible: state.showControls,
		setVisible: state.setShowControls,
	}))

	const container = useSharedValue(controls.isVisible ? 1 : 0)
	useEffect(
		() => {
			container.value = withTiming(controls.isVisible ? 1 : 0, {
				duration: 100,
			})
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[controls.isVisible],
	)

	const [showGlobalSettings, setShowGlobalSettings] = useState(false)

	const containerStyles = useAnimatedStyle(() => {
		return {
			display: container.value === 1 ? 'flex' : 'none',
		}
	})

	const { colors: gradientColors, locations: gradientLocations } = easeGradient({
		colorStops: {
			0: { color: 'rgba(0, 0, 0, 0.8)' },
			0.4: { color: 'rgba(0, 0, 0, 0.50)' },
			0.6: { color: 'rgba(0, 0, 0, 0.50)' },
			1: { color: 'rgba(0, 0, 0, 0.8)' },
		},
		extraColorStopsPerTransition: 16,
		easing: Easing.bezier(0.62, 0, 0.38, 1), // https://cubic-bezier.com/#.62,0,.38,1
	})

	return (
		<Fragment>
			<Header onShowGlobalSettings={() => setShowGlobalSettings(true)} />

			<Animated.View className={cn('absolute inset-0 z-10 flex-1')} style={containerStyles}>
				<Pressable
					onPress={() => controls.setVisible(false)}
					style={{
						flex: 1,
					}}
				>
					<LinearGradient
						colors={gradientColors}
						locations={gradientLocations}
						style={{ flex: 1 }}
					/>
				</Pressable>
			</Animated.View>

			<ImageReaderGlobalSettingsDialog
				isOpen={showGlobalSettings}
				onClose={() => setShowGlobalSettings(false)}
			/>

			<Footer />
		</Fragment>
	)
}
