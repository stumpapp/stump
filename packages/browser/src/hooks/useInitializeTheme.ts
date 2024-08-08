import { SupportedFont } from '@stump/types'
import { useEffect } from 'react'

type Params = {
	appTheme?: string
	appFont?: SupportedFont
}

export function useInitializeTheme({ appTheme, appFont = 'inter' }: Params) {
	useEffect(() => {
		const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)')
		const html = document.querySelector('html')
		html?.classList.remove(...(html?.classList ?? []))
		html?.classList.add(appTheme || prefersDarkMode.matches ? 'dark' : 'light')
	}, [appTheme])

	useEffect(() => {
		const body = document.querySelector('body')
		const fontClasses = Array.from(body?.classList ?? []).filter((c) => c.startsWith('font-'))
		body?.classList.remove(...fontClasses)
		body?.classList.add(`font-${appFont}`)
	}, [appFont])
}
