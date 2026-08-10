import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ThemeSheetContent from '~/components/book/reader/epub/ThemeSheetContent'

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
			<ThemeSheetContent />
		</SafeAreaView>
	)
}
