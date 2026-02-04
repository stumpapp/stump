import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { FADE_IN, FADE_OUT, useReaderAnimations } from '~/components/book/reader/shared'
import { Text } from '~/components/ui'
import { usePreferencesStore } from '~/stores'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import JumpButton from './JumpButton'

export const FOOTER_HEIGHT = 48

export default function ReadiumFooter() {
	const { colors } = useEpubTheme()

	const { secondaryStyle, primaryStyle } = useReaderAnimations()
	const preferMinimalReader = usePreferencesStore((state) => state.preferMinimalReader)
	const { page, pageOfTotal, formattedPageOfTotal } = usePositionFormat()

	return (
		<View className="inset-x-safe bottom-safe absolute z-20 h-12 items-center justify-center">
			{/* Controls hidden: Page only */}
			{!preferMinimalReader && (
				<Animated.View className="absolute w-full items-center justify-center" style={primaryStyle}>
					<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
						<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
							{page}
						</Text>
					</Animated.View>
				</Animated.View>
			)}

			{/* Controls shown: Page out of total */}
			<Animated.View className="absolute w-full items-center justify-center" style={secondaryStyle}>
				<JumpButton />

				<Animated.View key={page} entering={FADE_IN} exiting={FADE_OUT}>
					<Text className="font-medium opacity-50" style={{ color: colors?.foreground }}>
						{preferMinimalReader ? formattedPageOfTotal : pageOfTotal}
					</Text>
				</Animated.View>
			</Animated.View>
		</View>
	)
}

function usePositionFormat() {
	const page = useEpubLocationStore((state) => state.position)
	const totalPages = useEpubLocationStore((state) => state.totalPages)

	const pageOfTotal = `${page} of ${totalPages}`
	const formattedPageOfTotal = page < totalPages ? pageOfTotal : page

	return { page, pageOfTotal, formattedPageOfTotal }
}
