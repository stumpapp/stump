import { useMemo } from 'react'

import { useUserPreferences } from '../queries'
import { useUserStore } from '../stores'
import type { LayoutMode } from '@stump/types'

export type LayoutEntity = 'LIBRARY' | 'SERIES'

const DEFAULT_LAYOUT_MODE: LayoutMode = 'GRID'

// TODO: add callbacks for error?
export function useLayoutMode(entity: LayoutEntity) {
	const { user, userPreferences, setUserPreferences } = useUserStore()

	const { updateUserPreferences } = useUserPreferences(user?.id, {
		enableFetchPreferences: !user,
		onUpdated: setUserPreferences,
	})

	async function updateLayoutMode(mode: LayoutMode, onError?: (err: unknown) => void) {
		if (userPreferences) {
			const key = entity === 'LIBRARY' ? 'library_layout_mode' : 'series_layout_mode'

			updateUserPreferences({
				...userPreferences,
				[key]: mode,
			}).catch((err) => {
				onError?.(err)
			})
		}
	}

	// TODO: update function for changing layout mode
	const layoutMode = useMemo(() => {
		if (!userPreferences) {
			return DEFAULT_LAYOUT_MODE
		}

		switch (entity) {
			case 'LIBRARY':
				return userPreferences.library_layout_mode || DEFAULT_LAYOUT_MODE
			case 'SERIES':
				return userPreferences.series_layout_mode || DEFAULT_LAYOUT_MODE
			default:
				console.warn('Unknown layout entity', entity)
				return DEFAULT_LAYOUT_MODE
		}
	}, [entity, userPreferences])

	return { layoutMode, updateLayoutMode }
}
