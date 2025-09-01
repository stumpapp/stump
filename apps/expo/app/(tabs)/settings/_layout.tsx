import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { settingsQueryClient } from '~/components/appSettings/queryClient'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<QueryClientProvider client={settingsQueryClient}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: animationEnabled ? 'default' : 'none',
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						title: 'Settings',
						headerShown: true,
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: 'regular',
						animation: animationEnabled ? 'default' : 'none',
					}}
				/>
			</Stack>
		</QueryClientProvider>
	)
}
