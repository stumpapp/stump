import { SupportedFont } from '@stump/graphql'
import { useEffect } from 'react'

/**
 * The parameters for the `useApplyTheme` hook
 */
type Params = {
	/**
	 * The theme to apply to the app
	 */
	appTheme?: string
	/**
	 * The font to apply to the app
	 */
	appFont?: SupportedFont
}

/**
 * A hook that applies the provided theme values to the app whenever they change
 *
 * @param appTheme The theme to apply to the app, applied to the `html` element
 * @param appFont The font to apply to the app, applied to the `body` element
 */
export function useApplyTheme({ appTheme, appFont = SupportedFont.Inter }: Params) {
	/**
	 * The effect responsible for applying the theme to the app. If the `appTheme` is not provided,
	 * the app will default to the user's system preference or the light theme
	 */
	useEffect(() => {
		const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)')
		const html = document.querySelector('html')
		// Note: the html root currently will only ever have a theme class applied, so we don't need
		// to worry about removing other classes. If this changes, we'll need to update this logic and likely
		// prefix the theme class with `theme-` to avoid conflicts
		const htmlClasses = Array.from(html?.classList ?? [])
		const resolvedTheme = appTheme?.toLowerCase() || (prefersDarkMode.matches ? 'dark' : 'light')
		// Only change the theme if we actually need to (i.e. the theme on the html is diff)
		if (!htmlClasses.length || htmlClasses.some((c) => c !== resolvedTheme)) {
			html?.classList.remove(...htmlClasses)
			html?.classList.add(resolvedTheme)
		}
	}, [appTheme])

	/**
	 * The effect responsible for applying the font to the app. If the `appFont` is not provided,
	 * the app will default to the Inter font
	 */
	useEffect(() => {
		const body = document.querySelector('body')
		const fontClasses = Array.from(body?.classList ?? []).filter((c) => c.startsWith('font-'))
		if (fontClasses.length > 1) {
			console.warn('More than one font class found on body:', fontClasses)
		}
		// Only change the font if we actually need to (i.e. the font on the body is diff)
		if (!fontClasses.length || fontClasses.some((c) => c !== `font-${appFont.toLowerCase()}`)) {
			body?.classList.remove(...fontClasses)
			body?.classList.add(`font-${appFont.toLowerCase()}`)
		}
	}, [appFont])
}
