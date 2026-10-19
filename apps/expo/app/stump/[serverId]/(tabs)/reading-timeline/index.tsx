import { SafeAreaView } from 'react-native-safe-area-context'

import { MyReadingTimeline } from '~/components/readingTimeline'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
			<MyReadingTimeline />
		</SafeAreaView>
	)
}
