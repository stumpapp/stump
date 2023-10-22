import { BookClubChatMessage, User } from '@stump/types'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import ChatMessage from './ChatMessage'

export default function BookClubChatBoardScene() {
	const [search] = useSearchParams()

	const archivedChatId = search.get('archived_chat_id') ?? undefined

	// TODO: query either archived chat or current chat!

	return (
		<div className="md:h-full md:overflow-y-scroll">
			{mockMessages.map((message) => (
				<ChatMessage key={message.id} message={message} archivedChatId={archivedChatId} />
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
