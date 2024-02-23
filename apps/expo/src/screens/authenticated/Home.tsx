import { authApi } from '@stump/api'
import { queryClient } from '@stump/client'
import { useColorScheme } from 'nativewind'
import React from 'react'
import { Button } from 'react-native'

import { ScreenRootView, Text } from '@/components'
import { useUserStore } from '@/stores'

export default function Home() {
	const { colorScheme, toggleColorScheme } = useColorScheme()

	const setUser = useUserStore((state) => state.setUser)

	const handleLogout = async () => {
		try {
			await authApi.logout()
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
			<Text>I am home : {colorScheme}</Text>
			<Button title="Toggle color scheme" onPress={toggleColorScheme} />
			<Button title="Logout" onPress={handleLogout} />
		</ScreenRootView>
	)
}
