import { useLibraries } from '@stump/client'
import { Library } from '@stump/sdk'
import { useCallback } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ImageGrid } from '~/components/grid'
import { LibraryGridItem } from '~/components/library'

export default function Screen() {
	const { libraries, refetch, isRefetching } = useLibraries({ suspense: true })

	const renderItem = useCallback(
		({ item: library, index }: { item: Library; index: number }) => (
			<LibraryGridItem library={library} index={index} />
		),
		[],
	)

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ImageGrid
				header="Libraries"
				data={libraries || []}
				renderItem={renderItem}
				keyExtractor={(library) => library.id}
				onRefresh={refetch}
				isRefetching={isRefetching}
			/>
		</SafeAreaView>
	)
}
