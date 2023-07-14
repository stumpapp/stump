import { useLibraryStats } from '@stump/client'
import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native'

import LibraryStatsCard from '../../../components/library/LibraryStatsCard'
import { TitleText } from '../../../components/primitives/Text'

export default function HomeTab() {
	const { libraryStats } = useLibraryStats()

	return (
		<SafeAreaView className="mx-5 mt-10 flex-1">
			<Stack.Screen options={{ headerShown: false }} />
			<SafeAreaView className="flex flex-row justify-between">
				<TitleText text={'Stats'} />
			</SafeAreaView>
			{libraryStats && <LibraryStatsCard stats={libraryStats} />}
		</SafeAreaView>
	)
}
