import { ButtonOrLink, Heading, ScrollArea } from '@stump/components'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { useBookClubContext } from '@/components/bookClub'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import BookClubScheduleItem from './BookClubScheduleItem'

// TODO: two variants for:
// - home (constrained width)
// - settings (full width)

type Props = {
	showPastBooks?: boolean
}

export default function BookClubSchedule({ showPastBooks }: Props) {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const { bookClub, viewerCanManage } = useBookClubContext()

	const scheduleBooks = useMemo(
		() =>
			showPastBooks
				? bookClub.schedule?.books || []
				: (bookClub.schedule?.books || []).filter((book) => {
						const adjustedEnd = book.discussion_duration_days
							? dayjs(book.end_at).add(book.discussion_duration_days, 'day')
							: null
						return dayjs().isBefore(adjustedEnd) && dayjs().isAfter(dayjs(book.start_at))
					}) || [],
		[bookClub.schedule?.books, showPastBooks],
	)

	const renderBooks = () => {
		return (
			<div className="h-full w-full px-0 md:px-4">
				<ol className="relative h-full border-l border-gray-75 dark:border-gray-850">
					{scheduleBooks.map((book) => (
						<BookClubScheduleItem key={book.id} book={book} />
					))}
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
