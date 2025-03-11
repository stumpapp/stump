import { QueryClientContext, useSDK } from '@stump/client'
import { Library, Media, Series } from '@stump/sdk'
import { useQueries } from '@tanstack/react-query'
import debounce from 'lodash/debounce'
import { useCallback, useMemo, useState } from 'react'
import { SectionList, SectionListRenderItem, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { match } from 'ts-pattern'

import { useActiveServer } from '~/components/activeServer'
import { BookSearchItem } from '~/components/book'
import { Heading, Input, Text } from '~/components/ui'

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()

	const [searchQuery, setSearchQuery] = useState('')
	const setQuery = debounce(setSearchQuery, 300)

	const getBooks = useCallback(
		() =>
			sdk.media.get({
				search: searchQuery,
				limit: 10,
			}),
		[searchQuery, sdk],
	)

	const getSeries = useCallback(
		() =>
			sdk.series.get({
				search: searchQuery,
				limit: 10,
			}),
		[searchQuery, sdk],
	)

	const getLibraries = useCallback(
		() =>
			sdk.library.get({
				search: searchQuery,
				limit: 10,
			}),
		[searchQuery, sdk],
	)

	const [
		{ data: bookResults, isLoading: isLoadingBooks },
		{ data: seriesResults, isLoading: isLoadingSeries },
		{ data: librariesResults, isLoading: isLoadingLibraries },
	] = useQueries({
		context: QueryClientContext,
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

	const sections = useMemo<SectionData[]>(
		() =>
			[
				{
					title: 'Books',
					data: bookResults?.data || [],
				},
				{
					title: 'Series',
					data: seriesResults?.data || [],
				},
				{
					title: 'Libraries',
					data: librariesResults?.data || [],
				},
			].filter((section) => section.data.length),
		[bookResults, seriesResults, librariesResults],
	)

	const renderSectionItem = useCallback<
		SectionListRenderItem<Media | Series | Library, SectionData>
	>(
		({ item, section: { title: section } }) =>
			match(section)
				.with('Books', () => <BookSearchItem book={item as Media} search={searchQuery} />)
				.with('Series', () => <Text>{item.name}</Text>)
				.with('Libraries', () => <Text>{item.name}</Text>)
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

type SectionData = {
	title: string
	data: (Media | Series | Library)[]
}
