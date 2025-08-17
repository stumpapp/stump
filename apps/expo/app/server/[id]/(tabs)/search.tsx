import { useSDK } from '@stump/client'
import { graphql, PaginationInfo } from '@stump/graphql'
import { useQueries } from '@tanstack/react-query'
import debounce from 'lodash/debounce'
import { useCallback, useMemo, useState } from 'react'
import { SectionList, SectionListRenderItem, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match } from 'ts-pattern'

import { useActiveServer } from '~/components/activeServer'
import { BookSearchItem, IBookSearchItemFragment } from '~/components/book'
import { ILibrarySearchItemFragment, LibrarySearchItem } from '~/components/library'
import { ISeriesSearchItemFragment, SeriesSearchItem } from '~/components/series'
import { Heading, Input, Text } from '~/components/ui'

const mediaQuery = graphql(`
	query SearchMedia($filter: MediaFilterInput!) {
		media(filter: $filter, pagination: { cursor: { limit: 10 } }) {
			nodes {
				id
				...BookSearchItem
			}
			pageInfo {
				... on CursorPaginationInfo {
					nextCursor
				}
			}
		}
	}
`)

const seriesQuery = graphql(`
	query SearchSeries($filter: SeriesFilterInput!) {
		series(filter: $filter, pagination: { cursor: { limit: 10 } }) {
			nodes {
				id
				...SeriesSearchItem
			}
			pageInfo {
				... on CursorPaginationInfo {
					nextCursor
				}
			}
		}
	}
`)

const libraryQuery = graphql(`
	query SearchLibrary($search: String!) {
		libraries(search: $search, pagination: { cursor: { limit: 10 } }) {
			nodes {
				id
				...LibrarySearchItem
			}
			pageInfo {
				... on CursorPaginationInfo {
					nextCursor
				}
			}
		}
	}
`)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const [searchQuery, setSearchQuery] = useState('')
	const setQuery = debounce(setSearchQuery, 300)

	const getBooks = useCallback(
		() =>
			sdk.execute(mediaQuery, {
				filter: {
					_or: [
						{ name: { contains: searchQuery } },
						{ metadata: { title: { contains: searchQuery } } },
					],
				},
			}),
		[sdk, searchQuery],
	)

	const getSeries = useCallback(
		() =>
			sdk.execute(seriesQuery, {
				filter: {
					_or: [
						{ name: { contains: searchQuery } },
						{ metadata: { title: { contains: searchQuery } } },
					],
				},
			}),
		[searchQuery, sdk],
	)

	const getLibraries = useCallback(
		() =>
			sdk.execute(libraryQuery, {
				search: searchQuery,
			}),
		[searchQuery, sdk],
	)

	const [
		{ data: bookResults, isLoading: isLoadingBooks },
		{ data: seriesResults, isLoading: isLoadingSeries },
		{ data: librariesResults, isLoading: isLoadingLibraries },
	] = useQueries({
		queries: [
			{
				queryKey: [sdk.media.keys.get, { serverID, query: searchQuery }],
				queryFn: getBooks,
				enabled: !!searchQuery,
			},
			{
				queryKey: [sdk.series.keys.get, { serverID, query: searchQuery }],
				queryFn: getSeries,
				enabled: !!searchQuery,
			},
			{
				queryKey: [sdk.library.keys.get, { serverID, query: searchQuery }],
				queryFn: getLibraries,
				enabled: !!searchQuery,
			},
		],
	})

	const sections = useMemo<Section[]>(
		() =>
			[
				{
					title: 'Books',
					data: bookResults?.media.nodes || [],
					hasMore: getHasMore(bookResults?.media.pageInfo),
				},
				{
					title: 'Series',
					data: seriesResults?.series.nodes || [],
					hasMore: getHasMore(seriesResults?.series.pageInfo),
				},
				{
					title: 'Libraries',
					data: librariesResults?.libraries.nodes || [],
					hasMore: getHasMore(librariesResults?.libraries.pageInfo),
				},
			].filter((section) => section.data.length),
		[bookResults, seriesResults, librariesResults],
	)

	// TODO: don't do that
	const renderSectionItem = useCallback<SectionListRenderItem<SectionData, Section>>(
		({ item, section: { title: section } }) =>
			match(section)
				.with('Books', () => (
					<BookSearchItem book={item as IBookSearchItemFragment} search={searchQuery} />
				))
				.with('Series', () => (
					<SeriesSearchItem series={item as ISeriesSearchItemFragment} search={searchQuery} />
				))
				.with('Libraries', () => (
					<LibrarySearchItem library={item as ILibrarySearchItemFragment} search={searchQuery} />
				))
				.otherwise(() => null),
		[searchQuery],
	)

	const insets = useSafeAreaInsets()

	const isLoading = isLoadingBooks || isLoadingSeries || isLoadingLibraries
	const isInitial = (!sections.length && !searchQuery.length) || (isLoading && !sections.length)

	// TODO: Bring focus to the search input when the screen is focused, sorta like portal? Figure out what iOS does
	// TODO: Animate list in/out instead
	return (
		<View
			className="flex-1 items-start justify-start gap-5 bg-background p-4 tablet:p-7"
			style={{
				paddingTop: insets.top + 28,
			}}
		>
			<Heading size="xl">Search</Heading>
			<Input onChangeText={(text) => setQuery(text)} placeholder="Search" />

			<SectionList
				style={{
					opacity: isInitial ? 0 : 1,
					flex: 1,
					width: '100%',
				}}
				sections={sections}
				renderSectionHeader={({ section: { title } }) => (
					<Heading size="lg" className="text-foreground-muted">
						{title}
					</Heading>
				)}
				renderItem={renderSectionItem}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={<Text>No results found</Text>}
			/>
		</View>
	)
}

type SectionData = (
	| IBookSearchItemFragment
	| ISeriesSearchItemFragment
	| ILibrarySearchItemFragment
) & {
	id: string
}

type Section = {
	title: string
	// TODO: type me
	data: SectionData[]
	hasMore: boolean
}

const getHasMore = (pageInfo: Partial<PaginationInfo> | undefined): boolean =>
	pageInfo?.__typename === 'CursorPaginationInfo' && pageInfo.nextCursor != null
