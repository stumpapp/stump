import { SafeAreaView } from 'react-native-safe-area-context'

import Unimplemented from '~/components/Unimplemented'

export default function Screen() {
	return (
		<SafeAreaView className="flex-1 bg-background">
			<Unimplemented />
		</SafeAreaView>
	)
}
