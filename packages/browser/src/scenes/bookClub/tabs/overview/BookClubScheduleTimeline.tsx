import { ButtonOrLink, Heading, ScrollArea } from '@stump/components'
import React from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { useBookClubContext } from '@/components/bookClub'
import GenericEmptyState from '@/components/GenericEmptyState'
import paths from '@/paths'

import BookClubScheduleTimelineItem from './BookClubScheduleTimelineItem'

export default function BookClubScheduleTimeline() {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const { bookClub, viewerCanManage } = useBookClubContext()

	const scheduleBooks = bookClub.schedule?.books || []

	const renderBooks = () => {
		if (!scheduleBooks?.length) {
			const message = viewerCanManage
				? 'You have not created a schedule yet. Click the button below to create one.'
				: 'This book club has not created a schedule yet.'
			return (
				<div className="flex flex-col px-4">
					<GenericEmptyState
						title="No schedule"
						subtitle={message}
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

		return (
			<div className="h-full w-full px-0 md:px-4">
				<ol className="relative h-full border-l border-gray-75 dark:border-gray-850">
					{scheduleBooks.map((book) => (
						<BookClubScheduleTimelineItem key={book.id} book={book} />
					))}
				</ol>
			</div>
		)
	}

	const renderContent = () => {
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
