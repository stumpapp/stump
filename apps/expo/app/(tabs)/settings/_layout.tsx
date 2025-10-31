import { QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { Platform } from 'react-native'

import { settingsQueryClient } from '~/components/appSettings/queryClient'
import { HeaderButton } from '~/components/ui/header-button/header-button'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

export default function Layout() {
	const router = useRouter()
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
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						animation: animationEnabled ? 'default' : 'none',
					}}
				/>

				<Stack.Screen
					name="reader"
					options={{
						title: 'Reader Settings',
						headerShown: true,
						headerTransparent: Platform.OS === 'ios',
						headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
						animation: animationEnabled ? 'default' : 'none',
						presentation: IS_IOS_24_PLUS ? 'formSheet' : 'modal',
						sheetGrabberVisible: true,
						sheetAllowedDetents: [0.95],
						sheetInitialDetentIndex: 0,
						headerBackVisible: true,
						headerBackButtonDisplayMode: 'minimal',
						headerLeft: () =>
							Platform.select({
								ios: <HeaderButton onPress={() => router.dismiss()} ios={{ variant: 'plain' }} />,
								default: undefined,
							}),
					}}
				/>
			</Stack>
		</QueryClientProvider>
	)
}
