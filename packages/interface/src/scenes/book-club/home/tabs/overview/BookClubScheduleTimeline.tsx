import { Heading, ScrollArea } from '@stump/components'
import React from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useMediaMatch } from 'rooks'

import { useBookClubContext } from '../../context'
import BookClubScheduleTimelineItem from './BookClubScheduleTimelineItem'

export default function BookClubScheduleTimeline() {
	const isMobile = useMediaMatch('(max-width: 768px)')
	const { bookClub } = useBookClubContext()

	const scheduleBooks = bookClub.schedule?.books || []
	// TODO: don't do this, prompt to create a schedule if viewerCanManage
	if (!scheduleBooks) {
		return null
	}

	const renderBooks = () => {
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
			<Heading size="md" className="flex items-center px-4 pb-4">
				Schedule
			</Heading>
			{renderContent()}
		</div>
	)
}
