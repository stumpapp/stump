import { ReaderProvider } from '@epubjs-react-native/core'
import { View } from 'react-native'

type Props = {
	children: React.ReactNode
}

// total ass, I hate epubjs lol maybe im just dumb? I cannot get the reader to listen to the height
export default function EpubJSReaderContainer({ children }: Props) {
	return (
		<View className="flex-none bg-background">
			<ReaderProvider>
				<View className="flex-none shrink">{children}</View>
				{/* <EpubJSFooter /> */}
			</ReaderProvider>
		</View>
	)
}
