import { Pressable } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

import { useReaderStore } from '~/stores'

import Footer from './Footer'
import Header from './Header'

export default function ControlsOverlay() {
	const controls = useReaderStore((state) => ({
		isVisible: state.showControls,
		setVisible: state.setShowControls,
	}))

	if (!controls.isVisible) return null

	return (
		<Animated.View className="absolute inset-0 z-10" entering={FadeIn} exiting={FadeOut}>
			<LinearGradient
				colors={[
					'hsla(0, 0%, 0%, 0.75)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.5)',
					'hsla(0, 0%, 0%, 0.95)',
				]}
				style={{
					flex: 1,
				}}
			>
				<Header />

				<Pressable onPress={() => controls.setVisible(false)} style={{ flex: 1 }} />

				<Footer />
			</LinearGradient>
		</Animated.View>
	)
}
