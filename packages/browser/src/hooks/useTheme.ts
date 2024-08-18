import { useMemo } from 'react'

import { usePreferences } from './usePreferences'

/**
 * A hook to get the current theme and toggle it with an API call
 **/
export function useTheme() {
	const {
		preferences: { app_theme },
		update,
	} = usePreferences()

	const changeTheme = (theme: string) =>
		update({
			app_theme: theme,
		})

	const isDarkVariant = useMemo(() => DARK_THEMES.includes(app_theme || 'light'), [app_theme])

	return { changeTheme, isDarkVariant, theme: app_theme || 'light' }
}

export const DARK_THEMES = ['dark']
