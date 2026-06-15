import { Easing, Pressable } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import { cn } from '~/lib/utils'
import { useReaderStore } from '~/stores'

import { useReaderAnimations } from './readerAnimations'

export default function ControlsBackdrop() {
	const controls = useReaderStore(
		useShallow((state) => ({
			isVisible: state.showControls,
			setVisible: state.setShowControls,
		})),
	)
	const { secondaryStyle } = useReaderAnimations()

	return (
		<Animated.View
			className={cn('inset-0 absolute z-10 flex-1')}
			style={secondaryStyle}
			// on android, when hidden the backdrop eats touches and prevents swiping to paginate
			pointerEvents={controls.isVisible ? 'auto' : 'none'}
		>
			<Pressable onPress={() => controls.setVisible(false)} style={{ flex: 1 }}>
				<LinearGradient {...IMAGE_READER_GRADIENT} style={{ flex: 1 }} />
			</Pressable>
		</Animated.View>
	)
}

const IMAGE_READER_GRADIENT = easeGradient({
	colorStops: {
		0: { color: 'rgba(0, 0, 0, 0.8)' },
		0.4: { color: 'rgba(0, 0, 0, 0.50)' },
		0.6: { color: 'rgba(0, 0, 0, 0.50)' },
		1: { color: 'rgba(0, 0, 0, 0.8)' },
	},
	extraColorStopsPerTransition: 16,
	easing: Easing.bezier(0.62, 0, 0.38, 1), // https://cubic-bezier.com/#.62,0,.38,1
})
