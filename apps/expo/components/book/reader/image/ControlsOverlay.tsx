import { Fragment, useEffect, useState } from 'react'
import { Pressable } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'

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
						colors={[
							'hsla(0, 0%, 0%, 0.75)',
							'hsla(0, 0%, 0%, 0.75)',
							'hsla(0, 0%, 0%, 0.5)',
							'hsla(0, 0%, 0%, 0.5)',
							'hsla(0, 0%, 0%, 0.5)',
							'hsla(0, 0%, 0%, 0.5)',
							'hsla(0, 0%, 0%, 0.75)',
							'hsla(0, 0%, 0%, 0.95)',
						]}
						style={{
							flex: 1,
						}}
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
