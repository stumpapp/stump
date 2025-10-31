import { X } from 'lucide-react-native'
import { Pressable } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { useColors } from '~/lib/constants'

import { Icon } from '../icon'
import { HeaderButtonProps } from './types'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function HeaderButton({ icon = { android: X }, onPress, style }: HeaderButtonProps) {
	const scale = useSharedValue(1)
	const colors = useColors()

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}))

	return (
		<AnimatedPressable
			hitSlop={20}
			onPress={onPress}
			onPressIn={() => {
				scale.value = withTiming(0.8)
			}}
			onPressOut={() => {
				scale.value = withTiming(1)
			}}
			style={[animatedStyle, style]}
		>
			<Icon
				as={icon?.android || X}
				size={icon?.size || 24}
				color={icon?.color || colors.foreground.DEFAULT}
			/>
		</AnimatedPressable>
	)
}
