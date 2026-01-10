import { useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn } from '@stump/components'
import { graphql } from '@stump/graphql'
import { Suspense, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'
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

const query = graphql(`
	query BookClubLayout($slug: String!) {
		bookClubBySlug(slug: $slug) {
			id
			name
			slug
			description
			isPrivate
			roleSpec
			creator {
				id
				displayName
				avatarUrl
			}
			membersCount
			membership {
				role
				isCreator
				avatarUrl
				__typename
			}
			schedule {
				id
				defaultIntervalDays
				books {
					id
					startAt
					endAt
					discussionDurationDays
					imageUrl
					title
					author
					url
					entity {
						id
						resolvedName
						thumbnail {
							url
						}
						metadata {
							writers
						}
					}
				}
			}
			createdAt
		}
	}
`)

export default function BookClubLayout() {
	const { sdk } = useSDK()
	const { slug } = useParams<{ slug: string }>()

	const {
		data: { bookClubBySlug: bookClub },
	} = useSuspenseGraphQL(query, sdk.cacheKey('bookClubBySlug', [slug]), { slug: slug || '' })

	const navigate = useNavigate()
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

	const viewerMember = useMemo(() => bookClub?.membership, [bookClub])
	const viewerCanManage =
		user?.isServerOwner || viewerMember?.isCreator || viewerMember?.role === 'ADMIN'
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

	useEffect(() => {
		if (!bookClub || (bookClub.isPrivate && !viewerIsMember)) {
			navigate('/404', { replace: true })
		}
	}, [bookClub, navigate, viewerIsMember])

	// Realistically this won't happen because of access control rules on the server,
	// but doesn't hurt to have an additional check here
	if (!bookClub || (bookClub.isPrivate && !viewerIsMember)) {
		// return <Navigate to="/404" />
		return null
	}

	// TODO: when viewing a thread, don't render the header
	return (
		<BookClubContext.Provider
			value={{
				bookClub,
				viewerCanManage,
				viewerIsMember,
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
