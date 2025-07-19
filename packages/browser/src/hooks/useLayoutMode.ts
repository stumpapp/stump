import type { LayoutMode } from '@stump/sdk'
import { useEffect, useMemo, useState } from 'react'

import { useUserStore } from '@/stores'

export function useLayoutMode() {
	const { userPreferences } = useUserStore((state) => ({
		userPreferences: state.userPreferences,
	}))

	const preferredLayoutMode = useMemo(
		() => userPreferences?.preferredLayoutMode as LayoutMode | undefined,
		[userPreferences?.preferredLayoutMode],
	)

	const [localLayout, setLocalLayout] = useState<LayoutMode>(() => preferredLayoutMode || 'GRID')

	useEffect(() => {
		if (preferredLayoutMode) {
			setLocalLayout(preferredLayoutMode)
		}
	}, [preferredLayoutMode])

	return {
		layoutMode: localLayout,
		preferredLayout: preferredLayoutMode,
		setLayoutMode: setLocalLayout,
	}
}
