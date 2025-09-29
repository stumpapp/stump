import { View } from 'react-native'

import Unimplemented from '~/components/Unimplemented'

export default function Screen() {
	return (
		<View className="flex-1 bg-background">
			<Unimplemented message="Downloads are not yet implemented" />
		</View>
	)
}
