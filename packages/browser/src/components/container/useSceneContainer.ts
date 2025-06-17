import { usePreferences } from '@/hooks'

export function useSceneContainer() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx },
	} = usePreferences()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	return {
		maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
	}
}
