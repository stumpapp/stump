import { useLibraryStats } from '@stump/client'
import { SafeAreaView } from 'react-native'

import LibraryStatsCard from '../../components/LibraryStatsCard'

export default function Home() {
	const { libraryStats } = useLibraryStats()

	return (
		<SafeAreaView className="flex-1">
			{libraryStats && <LibraryStatsCard stats={libraryStats} />}
		</SafeAreaView>
	)
}
