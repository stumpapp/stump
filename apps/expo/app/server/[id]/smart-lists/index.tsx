import { FlashList } from '@shopify/flash-list'
import { useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback, useRef } from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { useCollectionItemSize } from '~/components/image/collection-image/useCollectionSizes'
import ListEmpty from '~/components/ListEmpty'
import RefreshControl from '~/components/RefreshControl'
import { SmartListGridItem } from '~/components/smartList'
import { RefreshButton, Text } from '~/components/ui'

const query = graphql(`
	query SmartListsTabList {
		smartLists {
			id
			...SmartListGridItem
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, refetch } = useSuspenseGraphQL(query, ['smart-lists', serverID])
	const { numColumns, verticalGap, paddingHorizontal } = useCollectionItemSize()

	const [isRefetching, handleRefetch] = useRefetch(refetch)

	const nodes = data?.smartLists || []

	// This makes sure we do not repeat layout variants if possible:
	//
	// For example, there are only two layouts for libraries with 3 series,
	// and if only the 1st and 3rd libraries have 3 series, then if we used
	// FlashList index they would have both used the same layout variant
	const layoutRegistry = useRef({
		// The layout variant number (non-modulo) assigned to a library ID
		assignments: new Map<string, number>(),
		// Record the smallest unused layout variant number (non-modulo) for each catagory
		counters: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
	})

	const getLayoutNumber = useCallback((libraryId: string, itemCount: number) => {
		if (itemCount < 1 || itemCount > 5) return undefined

		const { assignments, counters } = layoutRegistry.current

		if (assignments.has(libraryId)) {
			return assignments.get(libraryId)!
		}

		const category = itemCount as 1 | 2 | 3 | 4 | 5
		const layoutNumber = counters[category]
		assignments.set(libraryId, layoutNumber)
		counters[category]++

		return layoutNumber
	}, [])

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
		>
			<FlashList
				data={nodes}
				renderItem={({ item }) => (
					<SmartListGridItem smartList={item} getLayoutNumber={getLayoutNumber} />
				)}
				contentContainerStyle={{
					paddingHorizontal: paddingHorizontal,
					paddingVertical: 16,
				}}
				numColumns={numColumns}
				ItemSeparatorComponent={() => <View style={{ height: verticalGap }} />}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					nodes.length > 0 ? (
						<RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} />
					) : undefined
				}
				ListEmptyComponent={
					<ListEmpty
						title="No smart lists yet"
						message="You can create smart lists in the web app to have them show up here"
						actions={
							<>
								<RefreshButton
									className="flex-row items-center"
									roundness="full"
									size="lg"
									onPress={() => handleRefetch()}
									isRefreshing={isRefetching}
								>
									<Text>Refresh</Text>
								</RefreshButton>
							</>
						}
					/>
				}
			/>
		</SafeAreaView>
	)
}
