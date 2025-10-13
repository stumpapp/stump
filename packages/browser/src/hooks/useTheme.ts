import { useMemo } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from './usePreferences'

/**
 * A hook to get the current theme and toggle it with an API call
 **/
export function useTheme() {
	const {
		preferences: { appTheme, enableGradients },
		update,
	} = usePreferences()
	const prefersDark = useMediaMatch('(prefers-color-scheme: dark)')

	const changeTheme = (theme: string) =>
		update({
			appTheme: theme,
		})

	const darkThemes = useMemo(
		() => [...DARK_THEMES, ...(prefersDark ? ['system'] : [])],
		[prefersDark],
	)

	/**
	 * Whether the current theme is a dark variant
	 */
	const isDarkVariant = useMemo(
		() => darkThemes.includes(appTheme || 'light'),
		[appTheme, darkThemes],
	)
	/**
	 * Whether the current theme supports gradients
	 */
	const isGradientSupported = useMemo(
		() => THEMES_WITH_GRADIENTS.includes(appTheme || 'light'),
		[appTheme],
	)
	/**
	 * If the user has gradients enabled and the theme supports gradients, we will
	 * use a gradient background instead of a solid color where possible
	 */
	const shouldUseGradient = useMemo(
		() => enableGradients && isGradientSupported,
		[enableGradients, isGradientSupported],
	)

	return {
		changeTheme,
		isDarkVariant,
		isGradientSupported,
		shouldUseGradient,
		theme: appTheme || 'light',
	}
}

export const DARK_THEMES = ['dark', 'ocean', 'cosmic', 'pumpkin', 'autumn']
export const THEMES_WITH_GRADIENTS = ['cosmic']
