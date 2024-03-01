import { ReaderProvider } from '@epubjs-react-native/core'
import React from 'react'

import { ScreenRootView, View } from '@/components/primitives'

type Props = {
	children: React.ReactNode
}

// total ass, I hate epubjs lol maybe im just dumb? I cannot get the reader to listen to the height
export default function EpubJSReaderContainer({ children }: Props) {
	return (
		<ScreenRootView classes="flex-none bg-white dark:bg-gray-950">
			<ReaderProvider>
				<View className="flex-none shrink dark:bg-gray-950">{children}</View>
				{/* <EpubJSFooter /> */}
			</ReaderProvider>
		</ScreenRootView>
	)
}
