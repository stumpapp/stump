import { useUpdatePreferences, useUserStore } from '..'

export type UseThemeParams = {
	onError?: (err: unknown) => void
}

/** A hook to get the current theme and toggle it. Please note that this hook
 *  **will not** handle the class toggling required by tailwind. That logic
 *  is handled by the `interface` package.
 **/
export function useTheme({ onError }: UseThemeParams = {}) {
	const { userPreferences, setUserPreferences } = useUserStore((state) => ({
		setUserPreferences: state.setUserPreferences,
		user: state.user,
		userPreferences: state.userPreferences,
	}))
	const { update } = useUpdatePreferences()

	const changeTheme = (theme: string) => {
		if (userPreferences) {
			setUserPreferences({
				...userPreferences,
				app_theme: theme,
			})

			try {
				update({
					...userPreferences,
					app_theme: theme,
				})
			} catch (err) {
				console.error(err)
				onError?.(err)
			}
		}
	}

	return { changeTheme, theme: userPreferences?.app_theme || 'light' }
}
