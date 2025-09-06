import { useMemo } from 'react'

import { useDisplay } from './useDisplay'

export function useListItemSize() {
	const { isTablet, width } = useDisplay()

	const itemHeight = useMemo(() => (isTablet ? 240 : 175), [isTablet])
	const itemWidth = useMemo(() => itemHeight * (2 / 3), [itemHeight])
	const gap = useMemo(() => (isTablet ? 8 : 4), [isTablet])

	const windowSize = useMemo(() => Math.round(width / itemWidth) + 1, [width, itemWidth])

	return {
		height: itemHeight,
		width: itemWidth,
		windowSize,
		gap,
	}
}
