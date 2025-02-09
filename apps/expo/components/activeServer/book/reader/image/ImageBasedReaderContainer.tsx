import { ComponentProps } from 'react'
import { SafeAreaView } from 'react-native'

import { IImageBasedReaderContext, ImageBasedReaderContext } from './context'
import Header from './Header'
import ImageBasedReader from './ImageBasedReader'

type Props = IImageBasedReaderContext & ComponentProps<typeof ImageBasedReader>

export default function ImageBasedReaderContainer({ initialPage, ...ctx }: Props) {
	return (
		<ImageBasedReaderContext.Provider value={ctx}>
			<SafeAreaView className="flex flex-1 items-center justify-center">
				<Header />

				<ImageBasedReader initialPage={initialPage} />
			</SafeAreaView>
		</ImageBasedReaderContext.Provider>
	)
}
