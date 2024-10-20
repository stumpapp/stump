import { LoadingFileProps } from '@epubjs-react-native/core'
import { useEffect, useState } from 'react'

import { Text, View } from '@/components/primitives'

// FIXME: This causes an error...
export default function LoadingSpinner({
	// downloadProgress,
	// downloadError,
	downloadSuccess,
}: LoadingFileProps) {
	// Setup a timeout that will check if we are stuck loading, abougt 10 seconds
	const [didTimeout, setDidTimeout] = useState(false)

	// If we are still loading after 10 seconds, we are stuck
	useEffect(() => {
		const timeout = setTimeout(() => {
			setDidTimeout(true)
		}, 10000)

		return () => clearTimeout(timeout)
	}, [])

	if (didTimeout && !downloadSuccess) {
		return (
			<View>
				<Text>It looks like we are stuck loading the book. Check your server logs</Text>
			</View>
		)
	} else if (!downloadSuccess) {
		return (
			<View>
				<Text>Loading...</Text>
			</View>
		)
	} else {
		return null
	}
}
