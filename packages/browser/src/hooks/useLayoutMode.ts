import { InterfaceLayout } from '@stump/graphql'
import { useEffect, useMemo, useState } from 'react'

import { useUserStore } from '@/stores'

export function useLayoutMode() {
	const { userPreferences } = useUserStore((state) => ({
		userPreferences: state.userPreferences,
	}))

	const preferredLayoutMode = useMemo(
		() => userPreferences?.preferredLayoutMode,
		[userPreferences?.preferredLayoutMode],
	)

	const [localLayout, setLocalLayout] = useState(() => preferredLayoutMode || InterfaceLayout.Grid)

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
