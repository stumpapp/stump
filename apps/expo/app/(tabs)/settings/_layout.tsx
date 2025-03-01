import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'

import { settingsQueryClient } from '~/components/appSettings/queryClient'

export default function Layout() {
	return (
		<QueryClientProvider client={settingsQueryClient}>
			<Stack
				screenOptions={{
					title: 'Settings',
					headerShown: false,
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						title: 'Settings',
						headerShown: false,
					}}
				/>
			</Stack>
		</QueryClientProvider>
	)
}
