import { queryClient, QueryClientContext, QueryClientProvider, useUserStore } from '@stump/client'
import { Stack, useRootNavigationState, useRouter } from 'expo-router'
import React, { Suspense, useEffect } from 'react'
import { Text } from 'react-native'

export default function Layout() {
	const navigationState = useRootNavigationState()
	const router = useRouter()

	const { user } = useUserStore((store) => ({
		user: store.user,
	}))

	useEffect(() => {
		// Temporary fix for the router not being ready.
		if (!navigationState?.key) return

		if (user) {
			queryClient.invalidateQueries(['getLibraries'])
			router.replace('/home')
			return
		}

		router.replace('/connect')
	}, [navigationState?.key, user])

	return (
		<QueryClientContext.Provider value={queryClient}>
			<QueryClientProvider client={queryClient}>
				<Suspense fallback={<Text>Loading...</Text>}>
					<Stack />
				</Suspense>
			</QueryClientProvider>
		</QueryClientContext.Provider>
	)
}
