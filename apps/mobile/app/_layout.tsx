import React, { useEffect } from 'react'
import { Stack, useRootNavigationState, useRouter } from 'expo-router'

export default function Layout() {
	const navigationState = useRootNavigationState()
	const router = useRouter()

	// TODO: Replace redirect logic with auth.
	useEffect(() => {
		// Temporary fix for the router not being ready.
		if (!navigationState?.key) return

		if (false) {
			router.replace('/home')
			return
		}

		router.replace('/connect')
	}, [navigationState?.key])

	return <Stack />
}
