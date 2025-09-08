import { Stack, useRouter } from 'expo-router'
import { Unplug } from 'lucide-react-native'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { Icon } from '~/components/ui/icon'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	const router = useRouter()

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="index"
				options={{
					headerShown: true,
					headerTitle: 'Home',
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
					headerLargeTitle: true,
					headerBlurEffect: 'regular',
					animation: animationEnabled ? 'default' : 'none',
					headerLeft: () => (
						<Pressable onPress={() => router.dismissAll()}>
							{({ pressed }) => (
								<View
									className={cn('aspect-square flex-1 items-start justify-center', {
										'mr-4': Platform.OS === 'android',
									})}
									style={{ opacity: pressed ? 0.6 : 1 }}
								>
									<Icon as={Unplug} size={20} className="text-foreground-muted" />
								</View>
							)}
						</Pressable>
					),
				}}
			/>
		</Stack>
	)
}
