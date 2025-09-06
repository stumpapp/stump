import { useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect, useMemo, useState } from 'react'
import { NativeSyntheticEvent, Platform, TextInputChangeEventData } from 'react-native'
import { icons } from '..'

const { ChevronLeft } = icons

type Params = {
	title: string
	headerLeft?: () => React.ReactNode
	headerRight?: () => React.ReactNode
	headerLargeTitle?: boolean
	headerSearchBarOptions?: {
		placeholder: string
		shouldShowHintSearchIcon?: boolean
		onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) => void
		onSearchButtonPress?: () => void
	}
	showBackButton?: boolean
}

export function useDynamicHeader({
	title,
	headerLeft,
	headerRight,
	showBackButton,
	...rest
}: Params) {
	const navigation = useNavigation()
	const [didSetOptions, setDidSetOptions] = useState(false)

	const router = useRouter()
	const resolvedHeaderLeft = useMemo(
		() =>
			headerLeft ??
			(showBackButton
				? () => <ChevronLeft className="text-foreground" onPress={() => router.back()} />
				: undefined),
		[headerLeft, showBackButton],
	)

	useLayoutEffect(() => {
		if (didSetOptions) return
		navigation.setOptions({
			headerLeft: resolvedHeaderLeft,
			headerRight,
			headerShown: true,
			headerTransparent: Platform.OS === 'ios',
			headerTitle: title,
			headerLargeTitleStyle: {
				fontSize: 24,
				lineHeight: 32,
			},
			headerBlurEffect: 'regular',
			...rest,
		})
		setDidSetOptions(true)
	}, [navigation, title, headerLeft, headerRight, rest, didSetOptions])
	return didSetOptions
}
