import { useInfiniteSuspenseGraphQL } from '@stump/client'
import { graphql, SeriesBookGridQuery } from '@stump/graphql'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useMemo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { EntityImage } from '@/components/entity'
import { usePreferences } from '@/hooks/usePreferences'

const query = graphql(`
	query SeriesBookGrid($id: String!, $pagination: Pagination) {
		media(filter: { seriesId: { eq: $id } }, pagination: $pagination) {
			nodes {
				id
				thumbnail {
					url
				}
				pages
				extension
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

export type SelectedBook = SeriesBookGridQuery['media']['nodes'][number]

type Props = {
	seriesId: string
	onSelectBook: (book: SeriesBookGridQuery['media']['nodes'][number]) => void
}

// TODO: Create generalized VirtualizedGrid component and trim the reused logic
export default function SeriesBookGrid({ seriesId, onSelectBook }: Props) {
	const { data, fetchNextPage, hasNextPage } = useInfiniteSuspenseGraphQL(
		query,
		['seriesBookGrid', seriesId],
		{
			id: seriesId,
			pagination: { cursor: { limit: 50 } },
		},
	)
	const nodes = data.pages.flatMap((page) => page.media.nodes)

	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)

	const handleScroll = () => {
		if (!hasNextPage || !scrollElement) return

		const { scrollHeight, scrollTop, clientHeight } = scrollElement

		if (scrollHeight - scrollTop === clientHeight) {
			fetchNextPage()
		}
	}

	return (
		<div className="h-96 w-full flex-1">
			<AutoSizer>
				{({ height, width }) => (
					<div
						ref={setScrollElement}
						className="overflow-x-hidden overflow-y-auto"
						style={{
							height,
							width,
						}}
						onScroll={handleScroll}
					>
						{scrollElement && (
							<List
								data={nodes}
								width={width - 16}
								onSelectBook={onSelectBook}
								scrollElement={scrollElement}
							/>
						)}
					</div>
				)}
			</AutoSizer>
		</div>
	)
}

type ListProps = {
	data: SeriesBookGridQuery['media']['nodes']
	width: number
	scrollElement: HTMLDivElement
} & Pick<Props, 'onSelectBook'>

const List = ({ data, width, onSelectBook, scrollElement }: ListProps) => {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const colsPerRow = useMemo(() => {
		if (!isAtLeastSmall) {
			return 3
		} else if (!isAtLeastMedium) {
			return 4
		} else {
			return 5
		}
	}, [isAtLeastSmall, isAtLeastMedium])

	const getWidth = useCallback(() => width / colsPerRow, [colsPerRow, width])

	const getSize = useCallback(() => getWidth() / thumbnailRatio, [getWidth, thumbnailRatio])

	const rowVirtualizer = useVirtualizer({
		count: Math.ceil(data.length / Math.floor(width / getWidth())),
		estimateSize: getSize,
		getScrollElement: () => scrollElement,
		overscan: 5,
	})

	return (
		<div
			style={{
				height: `${rowVirtualizer.getTotalSize()}px`,
				position: 'relative',
				width: '100%',
			}}
		>
			{rowVirtualizer.getVirtualItems().map((virtualRow) => {
				const startIndex = virtualRow.index * colsPerRow
				const endIndex = Math.min(startIndex + colsPerRow, data.length)
				const booksInRow = data.slice(startIndex, endIndex)

				return (
					<div
						key={virtualRow.index}
						style={{
							height: `${virtualRow.size}px`,
							left: 0,
							position: 'absolute',
							top: `${virtualRow.start}px`,
							width: '100%',
						}}
					>
						<div className="gap-2 flex">
							{booksInRow.map((book) => {
								const imageUrl = book?.thumbnail.url

								return (
									<EntityImage
										key={book.id}
										src={imageUrl}
										className="h-auto rounded-lg object-cover"
										style={{
											width: `${getWidth() - 8}px`,
											aspectRatio: thumbnailRatio,
										}}
										onClick={() => onSelectBook(book)}
									/>
								)
							})}
						</div>
					</div>
				)
			})}
		</div>
	)
}
