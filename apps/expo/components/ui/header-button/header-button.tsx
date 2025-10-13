import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Pressable } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { HeaderButtonProps } from './header-button.ios'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function HeaderButton({ imageProps, buttonProps }: HeaderButtonProps) {
	const scale = useSharedValue(1)

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}))

	return (
		<AnimatedPressable
			hitSlop={20}
			onPress={buttonProps?.onPress}
			onPressIn={() => {
				scale.value = withTiming(0.8)
			}}
			onPressOut={() => {
				scale.value = withTiming(1)
			}}
			style={animatedStyle}
		>
			<MaterialCommunityIcons
				// TODO: fix this type and _actually_ support both icon systems
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				name={(imageProps?.systemName as any) || 'cross'}
				size={24}
				color={imageProps?.color || 'grey'}
			/>
		</AnimatedPressable>
	)
}
