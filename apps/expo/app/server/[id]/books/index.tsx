import { FlashList, FlashListRef, ViewToken } from '@shopify/flash-list'
import { useInfiniteGraphQL, useRefetch, useSuspenseGraphQL } from '@stump/client'
import { graphql, InterfaceLayout } from '@stump/graphql'
import { keepPreviousData } from '@tanstack/react-query'
import { MeshGradientView } from 'expo-mesh-gradient'
import { useCallback, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { useActiveServer } from '~/components/activeServer'
import { BookListItem } from '~/components/book'
import { BooksListHeader } from '~/components/book/listHeader'
import ListEmpty from '~/components/ListEmpty'
import { useListSizing } from '~/components/listLayout'
import RefreshControl from '~/components/RefreshControl'
import { Button, Text } from '~/components/ui'
import { ON_END_REACHED_THRESHOLD } from '~/lib/constants'
import { BookFilterContext, createBookFilterStore, useInitialBookFilters } from '~/stores/filters'
import { useBooksLayout } from '~/stores/layout'

const query = graphql(`
	query BooksScreen(
		$pagination: Pagination
		$filters: MediaFilterInput
		$orderBy: [MediaOrderBy!]
	) {
		media(pagination: $pagination, filter: $filters, orderBy: $orderBy) {
			nodes {
				id
				...BookListItem
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					totalPages
					currentPage
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

const statsQuery = graphql(`
	query BooksScreenStats {
		librariesStats {
			seriesCount
			bookCount
			totalBytes
			completedBooks
			inProgressBooks
			totalReadingTimeSeconds
		}
	}
`)

const AnimatedMeshGradientView = Animated.createAnimatedComponent(MeshGradientView)

export default function Screen() {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const initialFilters = useInitialBookFilters()

	// eslint-disable-next-line react-hooks/refs
	const store = useRef(createBookFilterStore(initialFilters)).current

	const { filters, sort, resetFilters } = useStore(
		store,
		useShallow((state) => ({
			filters: state.filters,
			sort: state.sort,
			resetFilters: state.resetFilters,
		})),
	)

	const {
		data: { librariesStats: booksStats },
		refetch: refetchStats,
	} = useSuspenseGraphQL(statsQuery, ['booksStats', serverID])

	const {
		data,
		hasNextPage,
		fetchNextPage,
		refetch: refetchBooks,
	} = useInfiniteGraphQL(
		query,
		['books', serverID, filters, sort],
		{
			filters,
			orderBy: [sort],
			pagination: { offset: { page: 1 } },
		},
		{
			placeholderData: keepPreviousData,
		},
	)

	const layout = useBooksLayout('global', (state) => state.layout)
	const { numColumns, paddingHorizontal, ItemSeparatorComponent } = useListSizing({ layout })

	const isGrid = layout === InterfaceLayout.Grid

	// TODO: what to start with? keep as is (fades colours in), or use estimate lastItem with itemHeight + ItemSeparatorComponent height.
	const firstColor = useSharedValue('transparent')
	const lastColor = useSharedValue('transparent')

	const animatedProps = useAnimatedProps(() => {
		return { colors: [firstColor.value, firstColor.value, lastColor.value, lastColor.value] }
	})

	const flashListRef = useRef<FlashListRef<any>>(null)

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken<any>[] }) => {
			if (viewableItems.length > 0) {
				const scrollOffset = flashListRef.current?.getAbsoluteLastScrollOffset() ?? 0
				// we don't want the first visible item because that's often under the header
				// TODO: but just selecting the second item isn't a very accurate way to do it
				const firstIndex = scrollOffset <= 0 || isGrid ? 0 : 1

				const firstItem = viewableItems.at(firstIndex)?.item
				const lastItem = viewableItems.at(-1)?.item

				//TODO: use color-js for better light + dark colours
				const newFirstColor = firstItem?.thumbnail?.metadata?.averageColor + 'c0' || 'transparent'
				const newLastColor = lastItem?.thumbnail?.metadata?.averageColor + 'c0' || 'transparent'

				firstColor.set(withTiming(newFirstColor, { duration: 800 }))
				lastColor.set(withTiming(newLastColor, { duration: 800 }))
			}
		},
		[firstColor, lastColor, isGrid],
	)

	useEffect(() => {
		flashListRef.current?.recomputeViewableItems()
	}, [filters, layout, sort])

	const refetch = () => Promise.all([refetchBooks(), refetchStats()])

	const [isRefetching, onRefetch] = useRefetch(refetch)

	const onEndReached = useCallback(() => {
		if (hasNextPage) {
			fetchNextPage()
		}
	}, [hasNextPage, fetchNextPage])

	const isFiltered = Object.keys(filters).length > 0

	return (
		<BookFilterContext.Provider value={store}>
			<SafeAreaView
				style={{ flex: 1 }}
				edges={['left', 'right', ...(Platform.OS === 'ios' ? [] : ['bottom' as const])]}
			>
				<AnimatedMeshGradientView
					columns={2}
					rows={2}
					points={[
						[0, 0],
						[1, 0],
						[0, 1],
						[1, 1],
					]}
					animatedProps={animatedProps}
					style={{ position: 'absolute', inset: 0 }}
				/>
				<FlashList
					ref={flashListRef}
					key={layout} // force re-render when layout changes
					data={data?.pages.flatMap((page) => page.media.nodes) || []}
					renderItem={({ item }) => <BookListItem layout={layout} book={item} />}
					contentContainerStyle={{
						paddingVertical: 16,
						paddingHorizontal,
					}}
					numColumns={numColumns}
					onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
					onEndReached={onEndReached}
					onViewableItemsChanged={onViewableItemsChanged}
					viewabilityConfig={{
						itemVisiblePercentThreshold: isGrid ? 70 : 30,
						minimumViewTime: 800,
					}}
					contentInsetAdjustmentBehavior="automatic"
					ListHeaderComponent={<BooksListHeader stats={booksStats} />}
					ListHeaderComponentStyle={{ paddingBottom: 16, marginHorizontal: -paddingHorizontal }}
					refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefetch} />}
					ListEmptyComponent={
						<ListEmpty
							message={isFiltered ? 'No books found matching your filters' : 'No books returned'}
							actions={
								<>
									{isFiltered && (
										<Button roundness="full" variant="secondary" onPress={() => resetFilters()}>
											<Text>Clear Filters</Text>
										</Button>
									)}
									<Button roundness="full" onPress={() => refetch()}>
										<Text>Refresh</Text>
									</Button>
								</>
							}
						/>
					}
					ItemSeparatorComponent={ItemSeparatorComponent}
				/>
			</SafeAreaView>
		</BookFilterContext.Provider>
	)
}
