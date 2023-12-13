import { useChatBoardQuery } from '@stump/client/queries/bookClub'
import { ButtonOrLink, Card } from '@stump/components'
import { BookClubChatMessage, User } from '@stump/types'
import React from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import GenericEmptyState from '@/components/GenericEmptyState'

import paths from '../../../../../paths'
import { useBookClubContext } from '../../context'
import ChatMessage from './ChatMessage'

export default function BookClubChatBoardScene() {
	const { bookClub, viewerCanManage } = useBookClubContext()
	const [search] = useSearchParams()
	const archivedChatId = search.get('archived_chat_id') ?? undefined

	const { chatBoard, isLoading } = useChatBoardQuery({
		bookClubId: bookClub.id,
		chatId: archivedChatId,
	})
	const chatId = (chatBoard || { id: 'oopsies' }).id ?? archivedChatId

	if (isLoading) return null
	if (!chatBoard && !archivedChatId) {
		const canOpen = !!bookClub.schedule?.books?.length
		// NOTE: ew, kms
		const message = viewerCanManage
			? canOpen
				? 'You have not opened the chat board yet. Click the button below to open it'
				: 'There are no books in the schedule. You must add books to the schedule before a chat board can be opened'
			: 'The chat board has not been opened yet'

		return (
			<Card className="flex flex-col border-dashed px-4 pb-4">
				<GenericEmptyState title="No chat board available" subtitle={message} />
				<div className="self-center">
					{/* FIXME: render right thing */}
					{viewerCanManage && (
						<ButtonOrLink variant="secondary" href={paths.bookClubScheduler(bookClub.id)}>
							Create a schedule
						</ButtonOrLink>
					)}
				</div>
			</Card>
		)
	} else if (!chatBoard && archivedChatId) {
		return <Navigate to="/404" />
	}

	return (
		<div className="md:h-full md:overflow-y-scroll">
			{mockMessages.map((message) => (
				<ChatMessage key={message.id} message={message} chatId={chatId} />
			))}
		</div>
	)
}

const mockMessages: BookClubChatMessage[] = [
	{
		child_messages: [
			{
				content: 'I know right?!?!',
				id: '2',
				is_top_message: false,
				member: {
					hide_progress: false,
					id: '1',
					is_creator: false,
					private_membership: false,
					role: 'MEMBER',
					user: {
						id: '1',
						username: 'Stede Bonnet',
					} as User,
				},
				timestamp: new Date().toString(),
			},
		],
		content: 'WOW! Did you see that coming?? I cannot believe that happened!!!!',
		id: '1',
		is_top_message: true,
		member: {
			hide_progress: false,
			id: '2',
			is_creator: false,
			private_membership: false,
			role: 'MEMBER',
			user: {
				id: '1',
				username: 'Wee John',
			} as User,
		},
		timestamp: new Date().toString(),
	},
]
