import React from 'react'
import { SplashScreen, Stack } from 'expo-router'

export default function Layout() {
	const isLoaded = true

	if (!isLoaded) {
		return <SplashScreen />
	}

	return <Stack />
}
