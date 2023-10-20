// import { useBookClubQuery } from '@stump/client'
import { Avatar, Card, Heading, Text } from '@stump/components'
import { BookClub, Media, User } from '@stump/types'
import dayjs from 'dayjs'
import pluralize from 'pluralize'
import React from 'react'
import { useParams } from 'react-router'

import SceneContainer from '../../components/SceneContainer'
import BookClubScheduleTimeline from './BookClubScheduleTimeline'

const mockBookClub: BookClub = {
	created_at: '2020-12-01T00:00:00.000Z',
	description: 'A book club for fans of the OFMD series. All you can read pirate fiction!',
	id: '1',
	is_private: false,
	member_role_spec: {
		ADMIN: 'First Mate',
		CREATOR: 'Captain',
		MEMBER: 'Crewmate',
		MODERATOR: 'Boatswain',
	},
	members: [
		{
			display_name: 'Ed Teech',
			hide_progress: false,
			is_creator: true,
			private_membership: false,
			user: {
				id: '1',
				is_locked: false,
				username: 'thekraken',
			} as User,
		},
	],
	name: 'OFMD Fan Club',
	schedule: {
		books: [
			{
				book_entity: {
					id: '00685bd0-70d4-4a0e-80d3-8f95cdd45e97',
					name: 'The Kraken: Part 3',
				} as Media,
				chat_board: {
					id: '3',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: '2023-11-18T00:00:00.000Z',
				id: '3',
				order: 3,
				start_at: '2023-10-19T00:00:00.000Z',
			},
			{
				book_entity: {
					id: '018998c6-f021-4ab8-8944-58628096ce18',
					name: 'The Kraken: Part 2',
				} as Media,
				chat_board: {
					id: '2',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: '2021-01-31T00:00:00.000Z',
				id: '2',
				order: 2,
				start_at: '2021-01-01T00:00:00.000Z',
			},
			{
				book_entity: {
					id: '040173d0-00c4-4031-a430-b280f54d92c0',
					name: 'The Kraken',
				} as Media,
				chat_board: {
					id: '1',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: '2020-12-31T00:00:00.000Z',
				id: '1',
				order: 1,
				start_at: '2020-12-01T00:00:00.000Z',
			},
		],
		default_interval_days: 30,
	},
}

export default function BookClubHomeScene() {
	const { id } = useParams<{ id: string }>()

	// const { bookClub, isLoading } = useBookClubQuery(id || '', { enabled: !!id })
	const bookClub = mockBookClub

	const creator = bookClub.members?.find((member) => member.is_creator)
	const renderCreator = () => {
		if (!creator || (!creator.display_name && !creator.user)) {
			return null
		}

		const displayName = creator.display_name ?? creator.user?.username
		const avatarUrl = creator.user?.avatar_url ?? undefined

		return (
			<Card className="flex items-center justify-between gap-4 p-2.5">
				<Text size="sm" variant="muted">
					Created by
				</Text>

				<div className="flex items-center gap-2">
					<Avatar src={avatarUrl} fallback={displayName} className="h-8 w-8" />
					<Text size="sm">{displayName}</Text>
				</div>
			</Card>
		)
	}

	return (
		<SceneContainer className="flex h-full flex-col gap-4">
			<header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-0">
				<div className="md:max-w-xl">
					<Heading>{bookClub.name}</Heading>
					{/* TODO: read more text for long descriptions... */}
					<Text size="md">{bookClub.description}</Text>

					<div className="mt-2">
						<Text size="sm">
							<b>{bookClub.members?.length}</b>{' '}
							{pluralize(bookClub.member_role_spec['MEMBER'], bookClub?.members?.length || 0)} •{' '}
							Created <b>{dayjs(bookClub.created_at).format('MMMM YYYY')}</b>
						</Text>
					</div>
				</div>

				{renderCreator()}
			</header>

			<BookClubScheduleTimeline bookClub={mockBookClub} />
		</SceneContainer>
	)
}
