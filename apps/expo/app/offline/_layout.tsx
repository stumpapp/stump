import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'

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
					headerShown: false,
					animation: animationEnabled ? 'default' : 'none',
				}}
			/>
		</QueryClientProvider>
	)
}
