import { useColorScheme as useNativewindColorScheme } from 'nativewind'
import { useCallback } from 'react'

import { type ThemePreference, usePreferencesStore } from '~/stores/user'

export function useColorScheme() {
	const { colorScheme, setColorScheme: setNativewindColorScheme } = useNativewindColorScheme()
	const themePreference = usePreferencesStore((state) => state.themePreference)
	const patch = usePreferencesStore((state) => state.patch)

	const setColorScheme = useCallback(
		(value: ThemePreference) => {
			setNativewindColorScheme(value)
			patch({ themePreference: value })
		},
		[patch, setNativewindColorScheme],
	)

	const toggleColorScheme = useCallback(
		() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark'),
		[colorScheme, setColorScheme],
	)

	return {
		colorScheme: colorScheme ?? 'dark',
		isDarkColorScheme: colorScheme === 'dark',
		themePreference,
		setColorScheme,
		toggleColorScheme,
	}
}
