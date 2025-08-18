import { Platform } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ReaderSettings } from '~/components/book/reader/settings'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

export default function Screen() {
	useDynamicHeader({
		title: 'Reader Settings',
	})

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<ScrollView className="flex-1 bg-background p-4" contentInsetAdjustmentBehavior="automatic">
				<ReaderSettings />
			</ScrollView>
		</SafeAreaView>
	)
}
