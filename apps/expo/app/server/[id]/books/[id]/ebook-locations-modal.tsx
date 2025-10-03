import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import LocationsSheetContent from '~/components/book/reader/epub/LocationsSheetContent'

export default function Screen() {
	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={[
				'left',
				'right',
				...(Platform.OS === 'ios' ? [] : ['bottom' as const, 'top' as const]),
			]}
		>
			<LocationsSheetContent />
		</SafeAreaView>
	)
}
