import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'

import { settingsQueryClient } from '~/components/appSettings/queryClient'

export default function Layout() {
	return (
		<QueryClientProvider client={settingsQueryClient}>
			<Stack
				screenOptions={{
					headerShown: false,
				}}
			>
				<Stack.Screen
					name="index"
					options={{
						title: 'Settings',
						headerShown: true,
					}}
				/>
			</Stack>
		</QueryClientProvider>
	)
}
