import { useLibraryStats } from '@stump/client'
import { SafeAreaView, Text } from 'react-native'

import LibraryStatsCard from '../../components/LibraryStatsCard'

export default function HomeTab() {
	const { libraryStats } = useLibraryStats()

	return (
		<SafeAreaView className="mx-5 mt-10 flex-1">
			<SafeAreaView className="flex flex-row justify-between">
				<Text className="text-2xl font-semibold">Stats</Text>
			</SafeAreaView>
			{libraryStats && <LibraryStatsCard stats={libraryStats} />}
		</SafeAreaView>
	)
}
