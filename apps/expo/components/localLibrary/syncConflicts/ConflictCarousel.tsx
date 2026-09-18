import { useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import Carousel, { ICarouselInstance } from 'react-native-reanimated-carousel'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { SyncConflictPage, SyncConflictPageProps } from './SyncConflictPage'
import { ConflictRecord } from './types'

//  grabber 20ish + sheet header 56ish + top padding 20ish
const FIXED_OVERHEAD = 96

type Props = {
	records: ConflictRecord[]
} & Pick<SyncConflictPageProps, 'onAcceptBoth' | 'onApplySyncedSessionData'>

export function ConflictCarousel({ records, ...pageProps }: Props) {
	const { width, height } = useWindowDimensions()

	const insets = useSafeAreaInsets()
	const carouselRef = useRef<ICarouselInstance>(null)

	const [activeIndex, setActiveIndex] = useState(0)

	const carouselHeight = height - FIXED_OVERHEAD - insets.bottom

	// TODO: dots
	return (
		<View className="flex-1">
			<Carousel
				ref={carouselRef}
				width={width}
				height={carouselHeight}
				data={records}
				loop={false}
				onSnapToItem={setActiveIndex}
				renderItem={({ item, index }) => (
					<SyncConflictPage
						record={item}
						isWithinLoadingRange={Math.abs(activeIndex - index) <= 1}
						// ^ lil leeway to load next before actually visible
						{...pageProps}
					/>
				)}
			/>
		</View>
	)
}
