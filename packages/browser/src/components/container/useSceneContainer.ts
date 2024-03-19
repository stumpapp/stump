import { usePreferences } from '@/hooks'

export function useSceneContainer() {
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	return {
		maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
	}
}
