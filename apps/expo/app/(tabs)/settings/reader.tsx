import { Platform } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ReaderSettings } from '~/components/book/reader/settings'

export default function Screen() {
	const insets = useSafeAreaInsets()

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 bg-background p-4"
				contentInsetAdjustmentBehavior="automatic"
				contentContainerStyle={{ paddingBottom: insets.bottom }}
			>
				<ReaderSettings />
			</ScrollView>
		</SafeAreaView>
	)
}
