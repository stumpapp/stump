import { scrollbarWidth } from '@xobotyi/scrollbar-width'
import { useEffect, useState } from 'react'

type Return = {
	/**
	 * The scrollbar width in pixels.
	 */
	width: number
}

export function useScrollbarSize(): Return {
	const [width, setWidth] = useState(scrollbarWidth())

	useEffect(
		() => {
			if (typeof width !== 'undefined') {
				return
			}

			const raf = requestAnimationFrame(() => {
				setWidth(scrollbarWidth())
			})

			return () => cancelAnimationFrame(raf)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	)

	return {
		width: width || 0,
	}
}
