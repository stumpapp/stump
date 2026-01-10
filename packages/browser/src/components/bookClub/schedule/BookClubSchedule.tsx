import { ButtonOrLink, cn, Heading, ScrollArea, Text } from '@stump/components'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch, useToggle } from 'rooks'

import { useBookClubContext } from '@/components/bookClub'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import BookClubScheduleItem from './BookClubScheduleItem'

// TODO: two variants for:
// - home (constrained width)
// - settings (full width)

export default function BookClubSchedule() {
	const { bookClub, viewerCanManage } = useBookClubContext()

	const isMobile = useMediaMatch('(max-width: 768px)')
	/**
	 * Whether to show past books, as they are hidden by default to put the focus
	 * on the current books
	 */
	const [showPastBooks, togglePastBooks] = useToggle()

	/**
	 * All books in the schedule, sorted by start date descending (most recent first)
	 */
	const scheduleBooks = useMemo(
		() =>
			(bookClub.schedule?.books || []).toSorted((a, b) => dayjs(b.startAt).diff(dayjs(a.startAt))),
		[bookClub.schedule?.books],
	)
	/**
	 * The books which are currently active, based on their start and end dates
	 */
	const currentBooks = useMemo(
		() =>
			scheduleBooks.filter((book) => {
				const adjustedEnd = book.discussionDurationDays
					? dayjs(book.endAt).add(book.discussionDurationDays, 'day')
					: null
				return dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.startAt))
			}),
		[scheduleBooks],
	)
	/**
	 * The books which have already ended
	 */
	const pastBooks = useMemo(
		() => scheduleBooks.filter((book) => !currentBooks.includes(book)),
		[scheduleBooks, currentBooks],
	)

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
					{currentBooks.map((book) => (
						<BookClubScheduleItem key={book.id} book={book} />
					))}

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
							{pastBooks.map((book) => (
								<BookClubScheduleItem key={book.id} book={book} />
							))}
						</>
					)}
				</ol>
			</div>
		)
	}

	const renderContent = () => {
		if (!scheduleBooks?.length) {
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
			{!!scheduleBooks.length && (
				<Heading size="md" className="flex items-center px-4 pb-4">
					Schedule
				</Heading>
			)}
			{renderContent()}
		</div>
	)
}
