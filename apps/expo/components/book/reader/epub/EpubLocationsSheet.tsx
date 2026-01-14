import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { useEpubSheetStore } from '~/stores/epubSheet'

import LocationsSheetContent from './LocationsSheetContent'

export default function EpubLocationsSheet() {
	const sheetRef = useEpubSheetStore((state) => state.locationsSheetRef)

	const { colorScheme } = useColorScheme()
	const colors = useColors()
	const insets = useSafeAreaInsets()

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			cornerRadius={24}
			dimmed={false}
			scrollable
			grabber
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
			grabberOptions={{
				color: colorScheme === 'dark' ? '#333' : '#ccc',
			}}
			style={{
				paddingBottom: insets.bottom,
				flex: 1,
			}}
			insetAdjustment="automatic"
		>
			<LocationsSheetContent />
		</TrueSheet>
	)
}
