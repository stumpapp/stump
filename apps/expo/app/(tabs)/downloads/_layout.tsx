import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'

import { DownloadsHeaderMenu, DownloadsHeaderSortMenu } from '~/components/downloads'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

const offlineQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			throwOnError: false,
		},
	},
})

export default function Screen() {
	const animationEnabled = usePreferencesStore((state) => !state.reduceAnimations)

	return (
		<QueryClientProvider client={offlineQueryClient}>
			<Stack
				screenOptions={{
					title: 'Downloads',
					headerShown: Platform.OS === 'ios',
					headerTransparent: Platform.OS === 'ios',
					headerLargeTitle: true,
					headerBlurEffect: IS_IOS_24_PLUS ? undefined : 'regular',
					animation: animationEnabled ? 'default' : 'none',
					headerLargeTitleStyle: {
						fontSize: 30,
					},
					headerLeft: () => <DownloadsHeaderSortMenu />,
					headerRight: () => <DownloadsHeaderMenu />,
				}}
			/>
		</QueryClientProvider>
	)
}
