import { useMemo } from 'react'

import { usePreferences } from './usePreferences'

/**
 * A hook to get the current theme and toggle it with an API call
 **/
export function useTheme() {
	const {
		preferences: { app_theme, enable_gradients },
		update,
	} = usePreferences()

	const changeTheme = (theme: string) =>
		update({
			app_theme: theme,
		})

	/**
	 * Whether the current theme is a dark variant
	 */
	const isDarkVariant = useMemo(() => DARK_THEMES.includes(app_theme || 'light'), [app_theme])
	/**
	 * Whether the current theme supports gradients
	 */
	const isGradientSupported = useMemo(
		() => THEMES_WITH_GRADIENTS.includes(app_theme || 'light'),
		[app_theme],
	)
	/**
	 * If the user has gradients enabled and the theme supports gradients, we will
	 * use a gradient background instead of a solid color where possible
	 */
	const shouldUseGradient = useMemo(
		() => enable_gradients && isGradientSupported,
		[enable_gradients, isGradientSupported],
	)

	return {
		changeTheme,
		isDarkVariant,
		isGradientSupported,
		shouldUseGradient,
		theme: app_theme || 'light',
	}
}

export const DARK_THEMES = ['dark', 'cosmic', 'halloween', 'autum']
export const THEMES_WITH_GRADIENTS = ['cosmic']
