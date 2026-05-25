import { InterfaceRoundness, SupportedFont } from '@stump/graphql'
import { useEffect } from 'react'
import { useMediaMatch } from 'rooks'

import { DARK_THEMES } from './useTheme'

/**
 * The parameters for the `useApplyTheme` hook
 */
type Params = {
	/**
	 * The theme to apply to the app
	 */
	appTheme?: string
	/**
	 * The UI roundness to apply to radii (buttons, inputs, cards, etc)
	 */
	interfaceRoundness?: InterfaceRoundness
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
export function useApplyTheme({
	appTheme,
	appFont = SupportedFont.Inter,
	interfaceRoundness = InterfaceRoundness.Normal,
}: Params) {
	const prefersDark = useMediaMatch('(prefers-color-scheme: dark)')

	/**
	 * The effect responsible for applying the theme to the app. If the `appTheme` is not provided,
	 * the app will default to the user's system preference or the light theme
	 */
	useEffect(() => {
		const html = document.querySelector('html')
		if (!html) return

		let resolvedTheme = appTheme?.toLowerCase() || 'system'
		if (resolvedTheme === 'system') {
			resolvedTheme = prefersDark ? 'dark' : 'light'
		}

		html.classList.remove(...THEME_CLASSES)
		html.classList.add(resolvedTheme)

		const isDarkTheme =
			DARK_THEMES.includes(resolvedTheme) || (resolvedTheme === 'system' && prefersDark)

		// https://github.com/darkreader/darkreader/discussions/15128
		if (isDarkTheme) {
			let meta = document.querySelector('meta[name="color-scheme"]')
			if (!meta) {
				meta = document.createElement('meta')
				// @ts-expect-error: this is a valid attribute
				meta.name = 'color-scheme'
				// @ts-expect-error: this is a valid attribute
				meta.content = 'dark'
				document.head.appendChild(meta)
			}
		} else {
			// if we're switching to a light theme, we need to remove it so dark reader can mess with the colors
			// i imagine folks running dark reader won't hit this since why would they switch to light lol but
			// figure this is "correct" so
			const meta = document.querySelector('meta[name="color-scheme"]')
			if (meta) {
				document.head.removeChild(meta)
			}
		}
	}, [appTheme, prefersDark])

	/**
	 * The effect responsible for applying global roundness
	 */
	useEffect(() => {
		const html = document.querySelector('html')
		if (!html) return

		html.classList.remove(...ROUNDNESS_CLASSES)
		html.classList.add(
			ROUNDNESS_TO_CLASS[interfaceRoundness] ?? ROUNDNESS_TO_CLASS[InterfaceRoundness.Normal],
		)
	}, [interfaceRoundness])

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
		const fontSuffix = appFont.toLowerCase().replace(/_/g, '')
		if (!fontClasses.length || fontClasses.some((c) => c !== `font-${fontSuffix}`)) {
			body?.classList.remove(...fontClasses)
			body?.classList.add(`font-${fontSuffix}`)
		}
	}, [appFont])
}

const ROUNDNESS_TO_CLASS: Record<InterfaceRoundness, string> = {
	[InterfaceRoundness.None]: 'radius-none',
	[InterfaceRoundness.Normal]: 'radius-normal',
	[InterfaceRoundness.Rounded]: 'radius-rounded',
	[InterfaceRoundness.Pill]: 'radius-pill',
}

const ROUNDNESS_CLASSES = ['radius-none', 'radius-normal', 'radius-rounded', 'radius-pill']

const THEME_CLASSES = [
	'light',
	'dark',
	'bronze',
	'ocean',
	'autumn',
	'cosmic',
	'pumpkin',
	'midnight',
]
