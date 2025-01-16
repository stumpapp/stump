import { useLibraryByID, useLibraryStats, useVisitLibrary } from '@stump/client'
import { cn } from '@stump/components'
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

export default function LibraryLayout() {
	const navigate = useNavigate()
	const location = useLocation()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const { isLoading, library } = useLibraryByID(id)
	const { stats } = useLibraryStats({ cacheTime: 1000 * 60 * 5, id })
	const {
		preferences: {
			enable_double_sidebar,
			primary_navigation_mode,
			layout_max_width_px,
			enable_hide_scrollbar,
		},
	} = usePreferences()

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	const isMobile = useMediaMatch('(max-width: 768px)')

	const displaySideBar = !!enable_double_sidebar && !isMobile && isSettings
	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	useEffect(() => {
		if (!isLoading && !library) {
			navigate('/404')
		}
	}, [isLoading, library, navigate])

	const { visitLibrary } = useVisitLibrary()
	const alreadyVisited = useRef(false)
	useEffect(() => {
		if (library?.id && !alreadyVisited.current) {
			alreadyVisited.current = true
			visitLibrary(library.id)
		}
	}, [library?.id, visitLibrary])

	const renderHeader = () => (isSettings ? <LibrarySettingsHeader /> : <LibraryHeader />)

	if (isLoading || !library) return null

	return (
		<LibraryContext.Provider value={{ library, stats }}>
			<div
				className={cn('relative flex flex-1 flex-col', {
					'mx-auto w-full': preferTopBar && !!layout_max_width_px,
				})}
				style={{
					maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
				}}
			>
				{renderHeader()}

				{!isSettings && <LibraryNavigation />}

				{displaySideBar && <LibrarySettingsSidebar />}

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 p-0 md:pb-0', {
						'md:hide-scrollbar': !!enable_hide_scrollbar,
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
