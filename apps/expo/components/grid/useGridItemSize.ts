import { useMemo } from 'react'

import { useDisplay } from '~/lib/hooks'

export function useGridItemSize() {
	const { width, isTablet, isLandscapeTablet } = useDisplay()

	const padding = useMemo(() => (isTablet ? 16 : 20), [isTablet])
	const itemDimension = useMemo(
		() =>
			width / (isLandscapeTablet ? 7 : isTablet ? 4 : 2) -
			// 16 padding each side
			padding * 2,
		[isTablet, isLandscapeTablet, width, padding],
	)

	const spacing = useMemo(() => (isLandscapeTablet ? 30 : 25), [isLandscapeTablet])

	return { itemDimension, spacing }
}
