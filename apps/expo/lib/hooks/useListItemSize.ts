import { useMemo } from 'react'

import { usePreferencesStore } from '~/stores'

import { useDisplay } from './useDisplay'

export function useListItemSize() {
	const { isTablet, width } = useDisplay()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const itemWidth = useMemo(() => (isTablet ? 160 : 135), [isTablet])
	const itemHeight = useMemo(() => itemWidth / thumbnailRatio, [itemWidth, thumbnailRatio])
	const gap = useMemo(() => (isTablet ? 8 : 4), [isTablet])

	const windowSize = useMemo(() => Math.round(width / itemWidth) + 1, [width, itemWidth])

	return {
		height: itemHeight,
		width: itemWidth,
		windowSize,
		gap,
	}
}
