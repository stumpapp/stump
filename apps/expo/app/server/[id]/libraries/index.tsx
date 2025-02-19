import { useLibraries } from '@stump/client'
import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FlatGrid } from 'react-native-super-grid'

import { LibraryGridItem } from '~/components/library'
import RefreshControl from '~/components/RefreshControl'
import { Heading } from '~/components/ui'

export default function Screen() {
	const { width } = useWindowDimensions()
	const { libraries, refetch, isRefetching } = useLibraries({ suspense: true })

	// iPad or other large screens can have more columns (i.e., smaller itemDimension) but most phones should have 2 columns
	const isTablet = useMemo(() => width > 768, [width])
	const itemDimension = useMemo(
		() =>
			width /
				// 2 columns on phones
				(isTablet ? 4 : 2) -
			16 * 2,
		[isTablet, width],
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<FlatGrid
				ListHeaderComponent={() => (
					<Heading size="xl" className="px-4 pb-4 font-semibold">
						Libraries
					</Heading>
				)}
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
				itemDimension={itemDimension}
				data={libraries || []}
				renderItem={({ item: library }) => <LibraryGridItem library={library} />}
				keyExtractor={(library) => library.id}
			/>
		</SafeAreaView>
	)
}
