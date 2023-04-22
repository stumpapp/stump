import { queryClient, useUserStore } from '@stump/client'
import { useRootNavigationState, useRouter } from 'expo-router'
import { useEffect } from 'react'

/// This is the root component of the app.
/// It is responsible for redirecting the user to the correct page.
/// It is also responsible for invalidating the cache when the user logs in or out.
export default function App() {
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
			router.push('/home')
			return
		}

		router.push('/connect')
	}, [navigationState?.key, user])

	return null
}
