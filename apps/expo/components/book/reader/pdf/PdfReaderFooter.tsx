import { useMemo } from 'react'
import Animated from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

import { Text } from '~/components/ui'
import { usePdfStore } from '~/stores/pdf'

import { useReaderAnimations } from '../shared'

export const FOOTER_HEIGHT = 48

// TODO: Determine where to display read time:
// const elapsedSeconds = useBookReadTime(book.id)

export function PdfReaderFooter() {
	const position = usePdfStore(
		useShallow((state) => ({
			page: state.currentPage,
			totalPages: state.book?.pages,
		})),
	)
	const { secondaryStyle } = useReaderAnimations()

	const formattedPosition = useMemo(() => {
		if (!position.page) return null
		if (!position.totalPages) return `${position.page}`
		if (position.page < position.totalPages) {
			return `${position.page} of ${position.totalPages}`
		} else {
			return `${position.page}`
		}
	}, [position])

	return (
		<Animated.View
			className="insets-x-safe bottom-safe absolute z-20 h-12 flex-row items-center justify-center gap-2 px-2"
			style={secondaryStyle}
		>
			<Text
				className="font-medium"
				style={{
					color: 'white',
				}}
			>
				{formattedPosition}
			</Text>
		</Animated.View>
	)
}
