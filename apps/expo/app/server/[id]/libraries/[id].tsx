import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL, useSuspenseGraphQL } from '@stump/client'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStumpServer } from '~/components/activeServer'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { LibraryActionMenu } from '~/components/library'
import RefreshControl from '~/components/RefreshControl'
import SeriesGridItem from '~/components/series/SeriesGridItem'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

const query = graphql(`
	query LibrarySeriesScreenSeriesName($id: ID!) {
		libraryById(id: $id) {
			name
		}
	}
`)

const seriesQuery = graphql(`
	query LibrarySeriesScreen($filter: SeriesFilterInput!, $pagination: Pagination) {
		series(filter: $filter, pagination: $pagination) {
			nodes {
				id
				...SeriesGridItem
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
	const { id } = useLocalSearchParams<{ id: string }>()
	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(query, ['libraryById', id], { id })
	const { checkPermission } = useStumpServer()

	if (!library) {
		throw new Error(`Series with ID ${id} not found`)
	}

	useDynamicHeader({
		title: library.name,
		headerRight: checkPermission(UserPermission.ScanLibrary)
			? () => <LibraryActionMenu libraryId={id} />
			: undefined,
	})

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		seriesQuery,
		['librarySeries', id],
		{
			filter: {
				libraryId: { eq: id },
			},
		},
	)
	const { numColumns, paddingHorizontal } = useGridItemSize()

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
				data={data?.pages.flatMap((page) => page.series.nodes) || []}
				renderItem={({ item }) => <SeriesGridItem series={item} />}
				contentContainerStyle={{
					paddingHorizontal: paddingHorizontal,
					paddingVertical: 16,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			/>
		</SafeAreaView>
	)
}
