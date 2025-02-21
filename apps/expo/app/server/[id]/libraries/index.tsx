import { useLibraries } from '@stump/client'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlatGrid } from 'react-native-super-grid'

import { LibraryGridItem } from '~/components/library'
import RefreshControl from '~/components/RefreshControl'
import { Heading } from '~/components/ui'

export default function Screen() {
	const { libraries, refetch, isRefetching } = useLibraries({ suspense: true })

	return (
		<SafeAreaView className="flex-1 bg-background">
			<FlatGrid
				ListHeaderComponent={() => (
					<Heading size="xl" className="px-4 pb-4 font-semibold">
						Libraries
					</Heading>
				)}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				// itemDimension={itemDimension}
				data={libraries || []}
				renderItem={({ item: library }) => <LibraryGridItem library={library} />}
				keyExtractor={(library) => library.id}
				spacing={25}
			/>
		</SafeAreaView>
	)
}
