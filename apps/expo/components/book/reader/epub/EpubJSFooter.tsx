import { useReader } from '@epubjs-react-native/core'
import { View } from 'react-native'

import { Text } from '~/components/ui'

export const FOOTER_HEIGHT = 24

export default function EpubJSFooter() {
	const { currentLocation } = useReader()

	const currentPage = currentLocation?.start?.displayed.page || 1
	const totalPages = currentLocation?.end?.displayed.page || 1

	return (
		<View
			className="w-full shrink-0 items-start justify-start px-4"
			style={{ height: FOOTER_HEIGHT }}
		>
			<Text>
				{currentPage}/{totalPages}
			</Text>
		</View>
	)
}
