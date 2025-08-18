import { useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

type Params = {
	title: string
	headerLeft?: () => React.ReactNode
	headerRight?: () => React.ReactNode
}

export function useDynamicHeader({ title, headerLeft, headerRight }: Params) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			headerLeft,
			headerRight,
			headerShown: true,
			headerTransparent: Platform.OS === 'ios',
			headerTitle: title,
			headerLargeTitleStyle: {
				fontSize: 24,
				lineHeight: 32,
			},
			headerLargeTitle: true,
			headerBlurEffect: 'regular',
		})
	}, [navigation, title, headerLeft, headerRight])
}
