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

	const isDarkVariant = (app_theme || 'light').includes('dark')

	return { changeTheme, isDarkVariant, theme: app_theme || 'light' }
}
