import { Heading } from '@stump/components'
import { BookClub } from '@stump/types'
import React from 'react'

import BookClubScheduleTimelineItem from './BookClubScheduleTimelineItem'

type Props = {
	bookClub: BookClub
}
export default function BookClubScheduleTimeline({ bookClub }: Props) {
	const scheduleBooks = bookClub.schedule?.books || []

	// TODO: don't do this, prompt to create a schedule
	if (!scheduleBooks) {
		return null
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<Heading size="md">Schedule</Heading>
			<ol className="relative border-l border-gray-75 dark:border-gray-850">
				{scheduleBooks.map((book) => (
					<BookClubScheduleTimelineItem key={book.id} book={book} />
				))}
			</ol>
		</div>
	)
}
