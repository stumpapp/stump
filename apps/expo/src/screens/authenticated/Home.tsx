import { queryClient, useSDK } from '@stump/client'
import React from 'react'
import { Button } from 'react-native'

import { ScreenRootView, Text } from '@/components'
import { useUserStore } from '@/stores'

export default function Home() {
	const { sdk } = useSDK()
	const setUser = useUserStore((state) => state.setUser)

	const handleLogout = async () => {
		try {
			await sdk.auth.logout()
			setUser(null)
		} catch (err) {
			console.error(err)
		} finally {
			setUser(null)
			queryClient.clear()
		}
	}

	return (
		<ScreenRootView>
			<Text>I am home</Text>
			<Button title="Logout" onPress={handleLogout} />
		</ScreenRootView>
	)
}
