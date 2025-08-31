import { useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'
import { NativeSyntheticEvent, Platform, TextInputChangeEventData } from 'react-native'

type Params = {
	title: string
	headerLeft?: () => React.ReactNode
	headerRight?: () => React.ReactNode
	headerSearchBarOptions?: {
		placeholder: string
		shouldShowHintSearchIcon?: boolean
		onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) => void
		onSearchButtonPress?: () => void
	}
}

export function useDynamicHeader({ title, headerLeft, headerRight, ...rest }: Params) {
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
			...rest,
		})
	}, [navigation, title, headerLeft, headerRight, rest])
}
