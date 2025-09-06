import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useNavigation } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useCallback } from 'react'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { LibraryGridItem } from '~/components/library'
import { ILibraryGridItemFragment } from '~/components/library/LibraryGridItem'
import RefreshControl from '~/components/RefreshControl'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

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

	const navigation = useNavigation()
	useDynamicHeader({
		title: 'Libraries',
		headerLeft:
			Platform.OS === 'ios'
				? () => <ChevronLeft className="text-foreground" onPress={() => navigation.goBack()} />
				: undefined,
	})

	const { data, hasNextPage, fetchNextPage, refetch, isRefetching } = useInfiniteSuspenseGraphQL(
		query,
		['libraries', serverID],
	)
	const { numColumns } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const renderItem = useCallback(
		({ item, index }: { item: ILibraryGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<LibraryGridItem library={item} />
			</ColumnItem>
		),
		[numColumns],
	)

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<FlashList
				data={data?.pages.flatMap((page) => page.libraries.nodes) || []}
				renderItem={renderItem}
				contentContainerStyle={{
					padding: 16,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={0.75}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
			/>
		</SafeAreaView>
	)
}
