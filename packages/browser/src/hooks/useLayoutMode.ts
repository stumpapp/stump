import { InterfaceLayout } from '@stump/graphql'
import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useUserStore } from '@/stores'

export function useLayoutMode() {
	const { userPreferences } = useUserStore(
		useShallow((state) => ({
			userPreferences: state.userPreferences,
		})),
	)

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
