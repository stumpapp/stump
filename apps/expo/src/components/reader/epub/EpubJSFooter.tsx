import { useReader } from '@epubjs-react-native/core'
import React from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text, View } from '@/components/primitives'

export const FOOTER_HEIGHT = 24

export default function EpubJSFooter() {
	const { currentLocation } = useReader()

	const { bottom } = useSafeAreaInsets()

	const currentPage = currentLocation?.start?.displayed.page || 1
	const totalPages = currentLocation?.end?.displayed.page || 1

	return (
		<View
			className="w-full shrink-0 items-start justify-start px-4"
			style={{ height: FOOTER_HEIGHT + bottom }}
		>
			<Text>
				{currentPage}/{totalPages}
			</Text>
		</View>
	)
}
