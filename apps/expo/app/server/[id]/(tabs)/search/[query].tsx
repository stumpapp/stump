import { useSDK } from '@stump/client'
import { graphql, PaginationInfo } from '@stump/graphql'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Link, useLocalSearchParams } from 'expo-router'
import chunk from 'lodash/chunk'
import { useCallback } from 'react'
import { FlatList, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookSearchItem, IBookSearchItemFragment } from '~/components/book'
import { ILibrarySearchItemFragment, LibrarySearchItem } from '~/components/library'
import { ISeriesSearchItemFragment, SeriesSearchItem } from '~/components/series'
import { Heading, Text } from '~/components/ui'
import { icons } from '~/lib'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'

const { Search } = icons

const mediaQuery = graphql(`
	query SearchMedia($filter: MediaFilterInput!) {
		media(filter: $filter, pagination: { cursor: { limit: 10 } }) {
			nodes {
				id
				...BookSearchItem
			}
			pageInfo {
				__typename
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
				__typename
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
				__typename
				... on CursorPaginationInfo {
					nextCursor
				}
			}
		}
	}
`)

export default function Screen() {
	const { query } = useLocalSearchParams<{ query: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const client = useQueryClient()

	useDynamicHeader({
		title: `"${query}"`,
	})

	const getBooks = useCallback(() => {
		return sdk.execute(mediaQuery, {
			filter: {
				_or: [{ name: { contains: query } }, { metadata: { title: { contains: query } } }],
			},
		})
	}, [sdk, query, client])

	const getSeries = useCallback(
		() =>
			sdk.execute(seriesQuery, {
				filter: {
					_or: [{ name: { contains: query } }, { metadata: { title: { contains: query } } }],
				},
			}),
		[query, sdk],
	)

	const getLibraries = useCallback(
		() =>
			sdk.execute(libraryQuery, {
				search: query,
			}),
		[query, sdk],
	)

	const [
		{ data: bookResults, isLoading: isLoadingBooks },
		{ data: seriesResults, isLoading: isLoadingSeries },
		{ data: librariesResults, isLoading: isLoadingLibraries },
	] = useQueries({
		queries: [
			{
				queryKey: ['searchBooks', { serverID, query }],
				queryFn: getBooks,
				enabled: !!query,
			},
			{
				queryKey: ['searchSeries', { serverID, query }],
				queryFn: getSeries,
				enabled: !!query,
			},
			{
				queryKey: ['searchLibraries', { serverID, query }],
				queryFn: getLibraries,
				enabled: !!query,
			},
		],
	})

	// TODO: Loader
	if (isLoadingBooks || isLoadingSeries || isLoadingLibraries) {
		return null
	}

	const noResults = [
		bookResults?.media.nodes,
		seriesResults?.series.nodes,
		librariesResults?.libraries.nodes,
	].every((nodes) => !nodes?.length)

	if (noResults) {
		return (
			<View className="flex-1 items-center justify-center gap-4 bg-background p-4 tablet:p-7">
				<Search className="h-8 w-8 text-foreground-muted" />

				<View>
					<Text className="text-foreground-muted">No results found for "{query}"</Text>
				</View>
			</View>
		)
	}

	return (
		<SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
			<ScrollView
				className="flex-1 bg-background py-4 tablet:py-7"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="gap-2 pb-2">
					{!!bookResults?.media.nodes.length && (
						<View>
							<View className="mb-1 flex flex-row items-center justify-between px-4 tablet:px-7">
								<Heading size="default">Books</Heading>
								{getHasMore(bookResults?.media.pageInfo) && (
									<Link href={`/server/${serverID}/books/search[q]?q=${query}`}>
										<Text>See More</Text>
									</Link>
								)}
							</View>

							<FlatList
								data={chunk(bookResults?.media.nodes, 3)}
								renderItem={({ item }) => {
									return (
										<View>
											{item.map((book) => (
												<BookSearchItem
													key={book.id}
													book={book as IBookSearchItemFragment}
													search={query}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
								contentContainerStyle={{ paddingBottom: 8 }}
							/>
						</View>
					)}

					{!!seriesResults?.series.nodes.length && (
						<View>
							<View className="mb-1 flex flex-row items-center justify-between px-4 tablet:px-7">
								<Heading size="default">Series</Heading>
								{/* {getHasMore(seriesResults?.series.pageInfo) && (
									<Link href={`/server/${serverID}/books/search[q]?q=${searchQuery}`}>
										See More
									</Link>
								)} */}
							</View>

							<FlatList
								data={chunk(seriesResults?.series.nodes, 3)}
								renderItem={({ item }) => {
									return (
										<View>
											{item.map((series) => (
												<SeriesSearchItem
													key={series.id}
													series={series as ISeriesSearchItemFragment}
													search={query}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
								contentContainerStyle={{ paddingBottom: 8 }}
							/>
						</View>
					)}

					{!!librariesResults?.libraries.nodes.length && (
						<View className="pb-4">
							<View className="mb-1 flex flex-row items-center justify-between px-4 tablet:px-7">
								<Heading size="default">Libraries</Heading>
								{/* {getHasMore(seriesResults?.series.pageInfo) && (
									<Link href={`/server/${serverID}/books/search[q]?q=${searchQuery}`}>
										See More
									</Link>
								)} */}
							</View>

							<FlatList
								data={chunk(librariesResults?.libraries.nodes, 3)}
								renderItem={({ item }) => {
									return (
										<View>
											{item.map((library) => (
												<LibrarySearchItem
													key={library.id}
													library={library as ILibrarySearchItemFragment}
													search={query}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
								contentContainerStyle={{ paddingBottom: 8 }}
							/>
						</View>
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const getHasMore = (pageInfo: Partial<PaginationInfo> | undefined): boolean =>
	pageInfo?.__typename === 'CursorPaginationInfo' && pageInfo.nextCursor != null
