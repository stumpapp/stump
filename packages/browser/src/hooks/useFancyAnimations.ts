import { useState } from 'react'
import { useMediaMatch } from 'rooks'

import { usePreferences } from './usePreferences'

export function useFancyAnimations() {
	const {
		preferences: { enableFancyAnimations },
	} = usePreferences()

	const [isTouchDevice] = useState(() => !!('ontouchstart' in window))
	const isDesktop = useMediaMatch('(min-width: 1024px)')
	const shouldFancyHover = enableFancyAnimations && !isTouchDevice && isDesktop

	return { shouldFancyHover }
}
