import { usePreferences } from './usePreferences'

/** A hook to get the current theme and toggle it. Please note that this hook
 *  **will not** handle the class toggling required by tailwind. That logic
 *  is handled by the `interface` package.
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
