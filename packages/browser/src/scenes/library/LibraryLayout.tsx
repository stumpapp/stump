import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useMemo, useRef } from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { useMediaMatch } from 'rooks'

import { SceneContainer } from '@/components/container'
import { usePreferences } from '@/hooks'

import { LibraryContext } from './context'
import LibraryHeader from './LibraryHeader'
import LibraryNavigation from './LibraryNavigation'
import { LibrarySettingsHeader, LibrarySettingsSidebar } from './tabs/settings'

const query = graphql(`
	query LibraryLayout($id: ID!) {
		libraryById(id: $id) {
			id
			name
			description
			path
			stats {
				bookCount
				completedBooks
				inProgressBooks
			}
			tags {
				id
				name
			}
			thumbnail {
				url
			}
			...LibrarySettingsConfig
		}
	}
`)

const visitMutation = graphql(`
	mutation VisitLibrary($id: ID!) {
		visitLibrary(id: $id) {
			id
		}
	}
`)

export default function LibraryLayout() {
	const navigate = useNavigate()
	const location = useLocation()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const { sdk } = useSDK()
	const {
		data: { libraryById: library },
	} = useSuspenseGraphQL(query, sdk.cacheKey('libraryById', [id]), {
		id,
	})
	const {
		preferences: {
			enableDoubleSidebar,
			primaryNavigationMode,
			layoutMaxWidthPx,
			enableHideScrollbar,
		},
	} = usePreferences()
	const { mutate: visitLibrary } = useGraphQLMutation(visitMutation)

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	const isMobile = useMediaMatch('(max-width: 768px)')

	const displaySideBar = !!enableDoubleSidebar && !isMobile && isSettings
	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	useEffect(() => {
		if (!library) {
			navigate('/404')
		}
	}, [library, navigate])

	const alreadyVisited = useRef(false)
	useEffect(() => {
		if (library?.id && !alreadyVisited.current) {
			alreadyVisited.current = true
			visitLibrary({ id: library.id })
		}
	}, [library?.id, visitLibrary])

	const renderHeader = () => (isSettings ? <LibrarySettingsHeader /> : <LibraryHeader />)

	if (!library) return null

	return (
		<LibraryContext.Provider value={{ library }}>
			<div
				className={cn('relative flex flex-1 flex-col', {
					'mx-auto w-full': preferTopBar && !!layoutMaxWidthPx,
				})}
				style={{
					maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
				}}
			>
				{renderHeader()}

				{!isSettings && <LibraryNavigation />}

				{displaySideBar && <LibrarySettingsSidebar />}

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 p-0 md:pb-0', {
						'md:hide-scrollbar': !!enableHideScrollbar,
						'pl-48': displaySideBar,
					})}
				>
					<Suspense fallback={null}>
						<Outlet />
					</Suspense>
				</SceneContainer>
			</div>
		</LibraryContext.Provider>
	)
}
