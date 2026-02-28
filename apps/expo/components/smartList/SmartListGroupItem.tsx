import { ChevronDown } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Icon, Text } from '../ui'

type Props = {
	title: string
	isCollapsed: boolean
	onToggleCollapse: () => void
}

export default function SmartListGroupItem({ title, isCollapsed, onToggleCollapse }: Props) {
	const rotation = useSharedValue(isCollapsed ? 0 : 180)

	useEffect(() => {
		rotation.value = withTiming(isCollapsed ? 0 : 180, { duration: 200 })
	}, [isCollapsed, rotation])

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}))

	return (
		<Pressable onPress={onToggleCollapse}>
			<View className="flex-row items-center justify-between px-4 py-1">
				<Text className="text-xl font-medium tracking-wide">{title}</Text>

				<Animated.View style={animatedStyle}>
					<Icon as={ChevronDown} size={20} />
				</Animated.View>
			</View>
		</Pressable>
	)
}
