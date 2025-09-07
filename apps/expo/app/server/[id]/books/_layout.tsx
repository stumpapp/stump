import { Stack, useNavigation } from 'expo-router'
import { Platform } from 'react-native'

import { icons } from '~/lib'
import { usePreferencesStore } from '~/stores'

const { ChevronLeft } = icons

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)
	const navigation = useNavigation()

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				animation: animationEnabled ? 'default' : 'none',
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Books',
					headerLeft:
						Platform.OS === 'android'
							? undefined
							: () => (
									<ChevronLeft className="text-foreground" onPress={() => navigation.goBack()} />
								),
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 24,
					},
					headerBlurEffect: 'regular',
					headerLargeTitle: true,
				}}
			/>
		</Stack>
	)
}
