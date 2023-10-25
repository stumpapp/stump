import { ButtonOrLink, Card } from '@stump/components'
import dayjs from 'dayjs'
import React from 'react'

import GenericEmptyState from '../../../../../components/GenericEmptyState'
import paths from '../../../../../paths'
import { useBookClubContext } from '../../context'
import MemberSpecDisplay from './MemberSpecDisplay'

// TODO: For an admin+, show available book club settings
// TODO: for all members, show settings for managing their membership (leave, etc)
export default function BookClubSettingsScene() {
	const { bookClub, viewerCanManage } = useBookClubContext()

	const scheduledBooks = bookClub.schedule?.books ?? []
	const scheduleExists = !!scheduledBooks.length
	const currentBook = scheduledBooks.find(
		(book) =>
			dayjs(book.start_at).isBefore(dayjs()) &&
			dayjs(book.end_at).add(book.discussion_duration_days, 'days').isAfter(dayjs()),
	)

	const renderSchedulerLink = () => {
		if (!viewerCanManage) return null

		if (!scheduleExists || !currentBook) {
			const message = !scheduleExists
				? 'You have not created a schedule yet. Click the button below to get started'
				: 'No book is currently scheduled. Click the button below to manage the schedule'

			return (
				<Card className="flex flex-col items-center border-dashed p-4">
					<GenericEmptyState
						title={!scheduleExists ? 'No schedule' : 'Inactive schedule'}
						subtitle={message}
					/>
					<div>
						<ButtonOrLink variant="secondary" href={paths.bookClubScheduler(bookClub.id)}>
							{!scheduleExists ? 'Create schedule' : 'Manage schedule'}
						</ButtonOrLink>
					</div>
				</Card>
			)
		} else {
			return (
				<ButtonOrLink href={paths.bookClubScheduler(bookClub.id)}>Manage schedule</ButtonOrLink>
			)
		}
	}

	return (
		<div className="flex flex-col gap-4">
			{renderSchedulerLink()}
			<MemberSpecDisplay />
		</div>
	)
}
