import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useCallback } from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { LibraryGridItem } from '~/components/library'
import RefreshControl from '~/components/RefreshControl'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

const query = graphql(`
	query LibrariesScreen($pagination: Pagination) {
		libraries(pagination: $pagination) {
			nodes {
				id
				...LibraryGridItem
			}
			pageInfo {
				__typename
				... on CursorPaginationInfo {
					currentCursor
					nextCursor
					limit
				}
			}
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		query,
		['libraries', serverID],
	)
	const { numColumns, gap, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
		>
			<FlashList
				data={data?.pages.flatMap((page) => page.libraries.nodes) || []}
				renderItem={({ item }) => <LibraryGridItem library={item} />}
				contentContainerStyle={{
					paddingHorizontal: paddingHorizontal,
					paddingVertical: 16,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				ItemSeparatorComponent={() => <View style={{ height: gap * 2 }} />}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			/>
		</SafeAreaView>
	)
}
