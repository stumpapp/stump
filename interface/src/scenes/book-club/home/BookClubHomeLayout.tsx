import { useBookClubQuery, usePreferences, useUserStore } from '@stump/client'
import { cx } from '@stump/components'
import { BookClub, Media, User } from '@stump/types'
import React, { Suspense, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'

import BookClubHeader from './BookClubHeader'
import BookClubNavigation from './BookClubNavigation'
import { BookClubContext } from './context'

export default function BookClubHomeLayout() {
	const { id } = useParams<{ id: string }>()

	const { bookClub, isLoading } = useBookClubQuery(id || '', {
		enabled: !!id,
	})

	const location = useLocation()
	const user = useUserStore((store) => store.user)
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	const viewerMember = useMemo(
		() => mockBookClub.members?.find((member) => !!member.user?.id && member.user.id === user?.id),
		[user],
	)
	const viewerCanManage =
		user?.is_server_owner || viewerMember?.is_creator || viewerMember?.role === 'ADMIN'
	const viewerIsMember = !!viewerMember || !!user?.is_server_owner
	const isOnOverview = location.pathname.endsWith('/overview')

	// Realistically this won't happen because of access control rules on the server,
	// but doesn't hurt to have an additional check here
	if (bookClub?.is_private && !viewerIsMember) {
		return <Navigate to="/404" />
	}

	if (isLoading) return null
	if (!bookClub) {
		return <Navigate to="/404" />
	}

	// TODO: when viewing a thread, don't render the header
	return (
		<BookClubContext.Provider
			value={{
				// bookClub: mockBookClub,
				bookClub,
				viewerCanManage,
				viewerIsMember,
				viewerMember,
			}}
		>
			<BookClubHeader />
			<BookClubNavigation />
			<SceneContainer
				className={cx(
					'flex flex-col gap-4 pb-[100px] md:h-full md:pb-0',
					{
						'md:overflow-hidden': isOnOverview,
					},
					{ 'md:h-full md:overflow-y-auto': !isOnOverview },
					{ 'md:hide-scrollbar': !!enable_hide_scrollbar },
				)}
			>
				<Suspense fallback={null}>
					<Outlet />
				</Suspense>
			</SceneContainer>
		</BookClubContext.Provider>
	)
}

const mockBookClub: BookClub = {
	created_at: '2020-12-01T00:00:00.000Z',
	description: 'A book club for fans of the OFMD series. All you can read pirate fiction!',
	emoji: null,
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
			id: '1',
			is_creator: true,
			private_membership: false,
			role: 'CREATOR',
			user: {
				avatar_url:
					'https://cdn.vox-cdn.com/thumbor/16Dsgtyko77dGwc08YBk39h-Qj8=/1400x1400/filters:format(png)/cdn.vox-cdn.com/uploads/chorus_asset/file/24979372/Smile.png',
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
				start_at: '2023-10-19T00:00:00.000Z',
			},
			{
				author: 'Herman Melville',
				chat_board: {
					id: '2',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: '2021-01-31T00:00:00.000Z',
				id: '2',
				start_at: '2021-01-01T00:00:00.000Z',
				title: 'The Kraken: Part 2',
				url: 'https://www.gutenberg.org/files/2701/2701-h/2701-h.htm',
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
				start_at: '2020-12-01T00:00:00.000Z',
			},
		],
		default_interval_days: 30,
	},
}
