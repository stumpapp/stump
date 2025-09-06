import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql, MediaFilterInput } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'

import BookGridItem, { IBookGridItemFragment } from '~/components/book/BookGridItem'
import { ColumnItem } from '~/components/grid'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { icons } from '~/lib'

const { ChevronLeft } = icons

const query = graphql(`
	query BookSearchScreen($filter: MediaFilterInput!, $pagination: Pagination!) {
		media(filter: $filter, pagination: $pagination) {
			nodes {
				id
				...BookGridItem
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

export const prefetchBookSearch = (sdk: Api, client: QueryClient, search: string) => {
	return client.prefetchInfiniteQuery({
		queryKey: ['bookSearch', search],
		initialPageParam: { cursor: { limit: 20 } },
		queryFn: () =>
			sdk.execute(query, {
				filter: {
					_or: [{ name: { contains: search } }, { metadata: { title: { contains: search } } }],
				},
				pagination: { cursor: { limit: 20 } },
			}),
	})
}

export default function Screen() {
	const { q: searchQuery } = useLocalSearchParams<{ q: string }>()

	const navigation = useNavigation()

	// TODO: Back button not working
	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerTitle: 'Search Results',
			headerBackButtonMenuEnabled: true,
			headerLeft: () => (
				<ChevronLeft className="text-foreground" onPress={() => navigation.goBack()} />
			),
		})
	}, [navigation])

	const filter = useMemo<MediaFilterInput>(
		() => ({
			_or: [
				{ name: { contains: searchQuery } },
				{ metadata: { title: { contains: searchQuery } } },
			],
		}),
		[searchQuery],
	)
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['bookSearch', searchQuery],
		{
			filter,
			pagination: { cursor: { limit: 20 } },
		},
	)

	const { numColumns } = useGridItemSize()

	const renderItem = useCallback(
		({ item, index }: { item: IBookGridItemFragment; index: number }) => (
			<ColumnItem index={index} numColumns={numColumns}>
				<BookGridItem book={item} />
			</ColumnItem>
		),
		[numColumns],
	)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage])

	return (
		<FlashList
			data={data?.pages.flatMap((page) => page.media.nodes) || []}
			renderItem={renderItem}
			contentContainerStyle={{ padding: 16 }}
			centerContent
			numColumns={numColumns}
			onEndReachedThreshold={0.75}
			onEndReached={onEndReached}
		/>
	)
}
