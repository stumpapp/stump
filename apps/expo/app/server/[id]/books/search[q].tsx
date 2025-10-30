import { FlashList } from '@shopify/flash-list'
import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql, MediaFilterInput } from '@stump/graphql'
import { Api } from '@stump/sdk'
import { QueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useLayoutEffect, useMemo } from 'react'

import BookGridItem from '~/components/book/BookGridItem'
import ChevronBackLink from '~/components/ChevronBackLink'
import { useGridItemSize } from '~/components/grid/useGridItemSize'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'

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
			headerLeft: () => <ChevronBackLink />,
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

	const { numColumns, paddingHorizontal } = useGridItemSize()

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [fetchNextPage, hasNextPage])

	return (
		<FlashList
			data={data?.pages.flatMap((page) => page.media.nodes) || []}
			renderItem={({ item }) => <BookGridItem book={item} />}
			contentContainerStyle={{ paddingHorizontal: paddingHorizontal, paddingVertical: 16 }}
			centerContent
			numColumns={numColumns}
			onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
			onEndReached={onEndReached}
		/>
	)
}
