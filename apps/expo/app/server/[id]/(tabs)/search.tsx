import { useSDK } from '@stump/client'
import { graphql, PaginationInfo } from '@stump/graphql'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigation } from 'expo-router'
import chunk from 'lodash/chunk'
import debounce from 'lodash/debounce'
import { Search } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { FlatList, Platform, TextInputChangeEventData, View } from 'react-native'
import { NativeSyntheticEvent } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { BookSearchItem, IBookSearchItemFragment } from '~/components/book'
import { ILibrarySearchItemFragment, LibrarySearchItem } from '~/components/library'
import { ISeriesSearchItemFragment, SeriesSearchItem } from '~/components/series'
import { Heading, Text } from '~/components/ui'

import { prefetchBookSearch } from '../books/search[q]'

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
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const [searchQuery, setSearchQuery] = useState('')
	const setQuery = debounce(setSearchQuery, 300)

	const client = useQueryClient()
	const navigation = useNavigation()

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: true,
			headerSearchBarOptions: {
				placeholder: 'Search',
				onChangeText: (e: NativeSyntheticEvent<TextInputChangeEventData>) =>
					setQuery(e.nativeEvent.text),
			},
		})
	}, [navigation, setQuery])

	const getBooks = useCallback(() => {
		prefetchBookSearch(sdk, client, searchQuery)
		return sdk.execute(mediaQuery, {
			filter: {
				_or: [
					{ name: { contains: searchQuery } },
					{ metadata: { title: { contains: searchQuery } } },
				],
			},
		})
	}, [sdk, searchQuery, client])

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
				queryKey: ['searchBooks', { serverID, query: searchQuery }],
				queryFn: getBooks,
				enabled: !!searchQuery,
			},
			{
				queryKey: ['searchSeries', { serverID, query: searchQuery }],
				queryFn: getSeries,
				enabled: !!searchQuery,
			},
			{
				queryKey: ['searchLibraries', { serverID, query: searchQuery }],
				queryFn: getLibraries,
				enabled: !!searchQuery,
			},
		],
	})

	const isLoading = isLoadingBooks || isLoadingSeries || isLoadingLibraries
	const noResults = [
		bookResults?.media.nodes,
		seriesResults?.series.nodes,
		librariesResults?.libraries.nodes,
	].every((nodes) => !nodes?.length)
	const isInitial = (noResults && !searchQuery.length) || (isLoading && noResults)

	if (isInitial || noResults) {
		const message = isInitial ? 'Enter a search query to get started' : 'Nothing matches your query'
		return (
			<View className="flex-1 items-center justify-center gap-4 bg-background p-4 tablet:p-7">
				<Search className="h-8 w-8 text-foreground-muted" />

				<View>
					{!isInitial && <Heading>No Results Found</Heading>}
					<Text className="text-foreground-muted">{message}</Text>
				</View>
			</View>
		)
	}

	// TODO: Bring focus to the search input when the screen is focused, sorta like portal? Figure out what iOS does
	// TODO: Animate list in/out instead
	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 bg-background p-4 tablet:p-7"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="gap-4">
					{!!bookResults?.media.nodes.length && (
						<View>
							<View className="mb-1 flex flex-row items-center justify-between">
								<Heading size="default">Books</Heading>
								{getHasMore(bookResults?.media.pageInfo) && (
									<Link href={`/server/${serverID}/books/search[q]?q=${searchQuery}`}>
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
													search={searchQuery}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
							/>
						</View>
					)}

					{!!seriesResults?.series.nodes.length && (
						<View>
							<View className="mb-1 flex flex-row items-center justify-between">
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
													search={searchQuery}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
							/>
						</View>
					)}

					{!!librariesResults?.libraries.nodes.length && (
						<View className="pb-4">
							<View className="mb-1 flex flex-row items-center justify-between">
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
													search={searchQuery}
												/>
											))}
										</View>
									)
								}}
								keyExtractor={(item) => item.map((book) => book.id).join('-')}
								horizontal
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
