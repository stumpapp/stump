import { ReaderProvider } from '@epubjs-react-native/core'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import EpubJSFooter from './EpubJSFooter'

type Props = {
	children: React.ReactNode
}

// total ass, I hate epubjs lol maybe im just dumb? I cannot get the reader to listen to the height
export default function EpubJSReaderContainer({ children }: Props) {
	const insets = useSafeAreaInsets()

	return (
		<ReaderProvider>
			<View
				className="flex-1 bg-background"
				style={{
					paddingTop: insets.top,
					paddingBottom: insets.bottom,
				}}
			>
				<View className="flex-1 items-center">{children}</View>
				<EpubJSFooter />
			</View>
		</ReaderProvider>
	)
}
