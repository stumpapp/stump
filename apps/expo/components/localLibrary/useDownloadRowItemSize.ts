import { useMemo } from 'react'

import { useDisplay } from '~/lib/hooks'
import { usePreferencesStore } from '~/stores'

export function useDownloadRowItemSize() {
	const { isTablet } = useDisplay()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const itemHeight = useMemo(() => (isTablet ? 120 : 105), [isTablet])
	const itemWidth = useMemo(() => itemHeight * thumbnailRatio, [itemHeight, thumbnailRatio])

	return {
		height: itemHeight,
		width: itemWidth,
	}
}
