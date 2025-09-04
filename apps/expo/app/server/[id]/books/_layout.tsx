import { Stack, useNavigation, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { Platform } from 'react-native'

import { usePreferencesStore } from '~/stores'

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)
	const router = useRouter()
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
							: () => <ChevronLeft onPress={() => navigation.goBack()} />,
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
