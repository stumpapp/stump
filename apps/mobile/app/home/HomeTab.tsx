import { useLibraryStats } from '@stump/client'
import { SafeAreaView, Text } from 'react-native'

import LibraryStatsCard from '../../components/LibraryStatsCard'

export default function HomeTab() {
	const { libraryStats } = useLibraryStats()

	return (
		<SafeAreaView className="flex-1 mx-5 mt-10">
			<SafeAreaView className='flex flex-row justify-between'>
				<Text className='font-semibold text-2xl'>Stats</Text>
			</SafeAreaView>
			{libraryStats && <LibraryStatsCard stats={libraryStats} />}
		</SafeAreaView>
	)
}
