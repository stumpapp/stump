import { useMemo } from 'react'

import { useDisplay } from '~/lib/hooks'

export function useGridItemSize() {
	const { width, isTablet, isLandscapeTablet } = useDisplay()

	const itemDimension = useMemo(
		() =>
			width / (isLandscapeTablet ? 7 : isTablet ? 4 : 2) -
			// 16 padding each side
			16 * 2,
		[isTablet, isLandscapeTablet, width],
	)

	const spacing = useMemo(() => (isLandscapeTablet ? 30 : 25), [isLandscapeTablet])

	return { itemDimension, spacing }
}
