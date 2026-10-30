import { SafeAreaView } from 'react-native-safe-area-context'

import { MyReadingTimeline } from '~/components/readingTimeline'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1" edges={['left', 'right']}>
			<MyReadingTimeline />
		</SafeAreaView>
	)
}
