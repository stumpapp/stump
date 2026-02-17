import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { FlashList } from '@shopify/flash-list'
import { useInfiniteGraphQL, usePrefetchGraphQL } from '@stump/client'
import { BookClubBookInput, graphql, MediaFilterInput } from '@stump/graphql'
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IS_IOS_24_PLUS, ON_END_REACHED_THRESHOLD, useColors } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import BookGridItem from '../book/BookGridItem'
import { useGridItemSize } from '../grid/useGridItemSize'
import ListEmpty from '../ListEmpty'
import { Button, Input, Text } from '../ui'
import { PreviewBookSheet, PreviewBookSheetRef } from './PreviewBookSheet'

const query = graphql(`
	query AddBookSheet($pagination: Pagination, $filters: MediaFilterInput) {
		media(pagination: $pagination, filter: $filters) {
			nodes {
				id
				...BookGridItem
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

export const usePrefetchAddBookSheet = () => {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { client, execute, onError } = usePrefetchGraphQL()
	return useCallback(() => {
		client
			.prefetchInfiniteQuery({
				queryKey: ['books', serverID, {}],
				initialPageParam: { offset: { page: 1 } },
				queryFn: () =>
					execute(query, {
						filters: {},
						pagination: { offset: { page: 1 } },
					}),
			})
			.catch(onError)
	}, [client, onError, serverID, execute])
}

export type AddBookSheetRef = {
	open: () => void
	close: () => void
}

type Props = {
	onAddBook: (input: BookClubBookInput) => void
}

export const AddBookSheet = forwardRef<AddBookSheetRef, Props>(({ onAddBook }, ref) => {
	const sheetRef = useRef<TrueSheet>(null)
	const previewSheetRef = useRef<PreviewBookSheetRef>(null)

	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const [search, setSearch] = useState('')

	const [previewBookId, setPreviewBookId] = useState<string | null>(null)

	const onSelectBook = (bookId: string) => {
		setPreviewBookId(bookId)
		previewSheetRef.current?.open()
	}

	const filters = useMemo(
		() =>
			search
				? ({
						_or: [
							{
								name: {
									like: `%${search}%`,
								},
							},
							{
								metadata: {
									title: {
										like: `%${search}%`,
									},
								},
							},
						],
					} satisfies MediaFilterInput)
				: {},
		[search],
	)

	const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading, refetch } =
		useInfiniteGraphQL(query, ['books', serverID, filters], {
			filters,
			pagination: { offset: { page: 1 } },
		})
	const { numColumns, paddingHorizontal } = useGridItemSize()

	const colors = useColors()
	const insets = useSafeAreaInsets()

	useImperativeHandle(ref, () => ({
		open: () => {
			sheetRef.current?.present()
		},
		close: () => {
			sheetRef.current?.dismiss()
		},
	}))

	const onEndReached = useCallback(() => {
		if (hasNextPage && !isFetchingNextPage && !isLoading) {
			fetchNextPage()
		}
	}, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

	const isFiltered = Object.keys(filters ?? {}).length > 0

	return (
		<TrueSheet
			ref={sheetRef}
			detents={[1]}
			dimmed={false}
			cornerRadius={24}
			grabber
			scrollable
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.sheet.background}
			grabberOptions={{
				color: colors.sheet.grabber,
			}}
			style={{
				paddingBottom: insets.bottom,
			}}
			insetAdjustment="automatic"
		>
			<FlashList
				data={data?.pages.flatMap((page) => page.media.nodes) || []}
				renderItem={({ item }) => (
					<BookGridItem book={item} onPress={() => onSelectBook(item.id)} />
				)}
				contentContainerStyle={{
					paddingVertical: 16,
					paddingHorizontal: paddingHorizontal,
				}}
				numColumns={numColumns}
				onEndReachedThreshold={ON_END_REACHED_THRESHOLD}
				onEndReached={onEndReached}
				contentInsetAdjustmentBehavior="automatic"
				ListHeaderComponentStyle={{ paddingBottom: 16 }}
				ListHeaderComponent={
					<Input value={search} onChangeText={setSearch} placeholder="Search books..." />
				}
				ListEmptyComponent={
					<ListEmpty
						message={isFiltered ? 'No books found matching your filters' : 'No books returned'}
						actions={
							<>
								{isFiltered && (
									<Button roundness="full" variant="secondary" onPress={() => setSearch('')}>
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
			/>

			<PreviewBookSheet
				ref={previewSheetRef}
				bookId={previewBookId}
				onConfirmAddBook={() => {
					if (previewBookId) {
						onAddBook({ stored: { id: previewBookId } })
						previewSheetRef.current?.close()
					}
				}}
			/>
		</TrueSheet>
	)
})

AddBookSheet.displayName = 'AddBookSheet'
