import { useBookClubQuery } from '@stump/client'
import { cn } from '@stump/components'
import { BookClub, Media, User } from '@stump/sdk'
import dayjs from 'dayjs'
import { Suspense, useMemo } from 'react'
import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { BookClubContext } from '@/components/bookClub'
import { SceneContainer } from '@/components/container'
import { GenericSettingsHeader } from '@/components/settings'
import { usePreferences } from '@/hooks'
import { useUserStore } from '@/stores'

import BookClubHeader from './BookClubHeader'
import BookClubNavigation from './BookClubNavigation'
import { BookClubSettingsSideBar } from './tabs/settings'
import { routeGroups } from './tabs/settings/routes'

export default function BookClubLayout() {
	const { id } = useParams<{ id: string }>()

	const { bookClub, isLoading } = useBookClubQuery(id || '', {
		enabled: !!id,
	})

	const location = useLocation()
	const user = useUserStore((store) => store.user)
	const {
		preferences: {
			enableDoubleSidebar,
			primaryNavigationMode,
			layoutMaxWidthPx,
			enableHideScrollbar,
		},
	} = usePreferences()

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	const isMobile = useMediaMatch('(max-width: 768px)')

	const displaySideBar = !!enableDoubleSidebar && !isMobile && isSettings
	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const viewerMember = useMemo(
		() => mockBookClub.members?.find((member) => !!member.user?.id && member.user.id === user?.id),
		[user],
	)
	const viewerCanManage =
		user?.isServerOwner || viewerMember?.is_creator || viewerMember?.role === 'ADMIN'
	const viewerIsMember = !!viewerMember || !!user?.isServerOwner

	const renderHeader = () =>
		isSettings ? (
			<GenericSettingsHeader localeBase="bookClubSettingsScene" routeGroups={routeGroups} />
		) : (
			<>
				<BookClubHeader />
				<BookClubNavigation />
			</>
		)

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
				bookClub: mockBookClub,
				// bookClub,
				viewerCanManage,
				viewerIsMember,
				viewerMember,
			}}
		>
			<div
				className={cn('relative flex flex-1 flex-col', {
					'mx-auto w-full': preferTopBar && !!layoutMaxWidthPx,
				})}
				style={{
					maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
				}}
			>
				{renderHeader()}

				{displaySideBar && <BookClubSettingsSideBar />}

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 md:pb-0', {
						'md:hide-scrollbar': !!enableHideScrollbar,
						// pl-48 is for the sidebar, plus pl-4 for the padding
						'pl-52': displaySideBar,
					})}
				>
					<Suspense fallback={null}>
						<Outlet />
					</Suspense>
				</SceneContainer>
			</div>
		</BookClubContext.Provider>
	)
}

const mockBookClub: BookClub = {
	created_at: '2020-12-01T00:00:00.000Z',
	description: 'A book club for fans of the OFMD series. All you can read pirate fiction!',
	emoji: null,
	id: 'cm0lr4uop0008s05pf41vxj8r',
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
				book: {
					__type: 'stored',
					...({
						id: '03741e4a-ef32-4fb9-8ca7-661b0953b5e0',
						name: 'The Kraken: Part 3',
					} as Media),
				},
				discussion: {
					id: '3',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: dayjs().add(1, 'month').toISOString(),
				id: '3',
				start_at: dayjs().subtract(1, 'day').toISOString(),
			},
			{
				book: {
					__type: 'external',
					author: 'Herman Melville',
					title: 'Herman Melville',
					url: 'https://www.gutenberg.org/files/2701/2701-h/2701-h.htm',
				},
				discussion: {
					id: '2',
					messages: [],
				},
				discussion_duration_days: 2,
				end_at: '2021-01-31T00:00:00.000Z',
				id: '2',
				start_at: '2021-01-01T00:00:00.000Z',
			},
			{
				book: {
					__type: 'stored',
					...({
						id: '25e16406-c731-4209-8c44-5ea65a1a6212',
						name: 'The Kraken',
					} as Media),
				},
				discussion: {
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
