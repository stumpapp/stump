import { useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useLayoutEffect, useMemo } from 'react'
import { NativeSyntheticEvent, Platform, TextInputChangeEvent, View } from 'react-native'

import { Icon } from '~/components/ui'

import { IS_IOS_24_PLUS } from '../constants'

type Params = {
	title: string
	headerLeft?: () => React.ReactNode
	headerRight?: () => React.ReactNode
	headerLargeTitle?: boolean
	headerSearchBarOptions?: {
		placeholder: string
		shouldShowHintSearchIcon?: boolean
		onChangeText: (e: NativeSyntheticEvent<TextInputChangeEvent>) => void
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

	const router = useRouter()
	const resolvedHeaderLeft = useMemo(
		() =>
			headerLeft ??
			(showBackButton
				? () => (
						<View style={{ width: 35, height: 35, justifyContent: 'center', alignItems: 'center' }}>
							<Icon
								as={ChevronLeft}
								className="text-foreground"
								onPress={() => router.back()}
								size={24}
							/>
						</View>
					)
				: undefined),
		[headerLeft, showBackButton, router],
	)

	useLayoutEffect(() => {
		navigation.setOptions({
			...(headerLeft || showBackButton ? { headerLeft: resolvedHeaderLeft } : {}),
			headerRight,
			headerShown: true,
			headerTransparent: Platform.OS === 'ios',
			headerTitle: title,
			headerLargeTitleStyle: {
				fontSize: 24,
				lineHeight: 32,
			},
			headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
			...rest,
		})
	}, [navigation, title, headerLeft, headerRight, rest, resolvedHeaderLeft, showBackButton])
}
