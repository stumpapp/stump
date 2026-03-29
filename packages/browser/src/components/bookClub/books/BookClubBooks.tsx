import { useGraphQL } from '@stump/client'
import { ButtonOrLink, cn, Heading, ScrollArea, Text } from '@stump/components'
import { graphql } from '@stump/graphql'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch, useToggle } from 'rooks'

import { useBookClubContext } from '@/components/bookClub'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import BookClubBookItem from './BookClubBookItem'

// TODO: two variants for:
// - home (constrained width)
// - settings (full width)

const query = graphql(`
	query BookClubBooksScene($id: ID!) {
		bookClubById(id: $id) {
			id
			previousBooks {
				id
				...BookClubBookItem
			}
		}
	}
`)

export default function BookClubBooks() {
	const { bookClub, viewerCanManage } = useBookClubContext()

	const isMobile = useMediaMatch('(max-width: 768px)')
	/**
	 * Whether to show past books, as they are hidden by default to put the focus
	 * on the current books
	 */
	const [showPastBooks, togglePastBooks] = useToggle()

	const { data: pastQueryData } = useGraphQL(
		query,
		['bookClubBooks', 'pastBooks', bookClub.id],
		{
			id: bookClub.id,
		},
		{
			enabled: showPastBooks,
			initialData: {
				bookClubById: {
					id: bookClub.id,
					previousBooks: [],
				},
			},
		},
	)
	const pastBooks = pastQueryData?.bookClubById.previousBooks || []

	// TODO(book-clubs): animate the transition between showing and hiding past books, probably just
	// break out the past books into separate list?
	const renderBooks = () => {
		return (
			<div className="h-full w-full px-0 md:px-4">
				<ol
					className={cn('relative flex h-full flex-col space-y-4 border-l border-edge', {
						'pb-2': showPastBooks,
					})}
				>
					{bookClub.currentBook && <BookClubBookItem data={bookClub.currentBook} />}

					<div className="ml-3">
						<button
							className="rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
							type="button"
							onClick={togglePastBooks}
						>
							<Text className="cursor-pointer underline" size="sm" variant="muted">
								{showPastBooks ? 'Hide' : 'Show'} past books
							</Text>
						</button>
					</div>

					{showPastBooks && (
						<>
							{pastBooks?.map((book) => (
								<BookClubBookItem key={book.id} data={book} />
							))}
						</>
					)}
				</ol>
			</div>
		)
	}

	const renderContent = () => {
		if (!bookClub.currentBook && pastBooks.length === 0) {
			return (
				<div className="flex flex-col px-4">
					<GenericEmptyState
						title="No books to display"
						subtitle="The club has no books scheduled"
						containerClassName="md:justify-start md:items-start"
						contentClassName="md:text-left"
					/>
					{viewerCanManage && (
						<ButtonOrLink variant="secondary" href={paths.bookClubScheduler(bookClub.id)}>
							Create a schedule
						</ButtonOrLink>
					)}
				</div>
			)
		}

		if (isMobile) {
			return renderBooks()
		}

		return (
			<AutoSizer>
				{({ height, width }) => (
					<ScrollArea style={{ height: height - 46, width }}>{renderBooks()}</ScrollArea>
				)}
			</AutoSizer>
		)
	}

	return (
		<div className="flex h-full w-full flex-col md:-ml-4 md:w-2/3 lg:w-[28rem]">
			{!!bookClub.currentBook && (
				<Heading size="md" className="flex items-center px-4 pb-4">
					Books
				</Heading>
			)}
			{renderContent()}
		</div>
	)
}
