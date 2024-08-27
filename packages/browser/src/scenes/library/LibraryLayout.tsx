import { useLibraryByIdQuery, useLibraryStats } from '@stump/client'
import { cn } from '@stump/components'
import React, { useMemo } from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router'

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

	const { isLoading, library } = useLibraryByIdQuery(id)
	const { stats } = useLibraryStats({ cacheTime: 1000 * 60 * 5, id })
	const {
		preferences: {
			enable_double_sidebar,
			// primary_navigation_mode,
			// layout_max_width_px,
			enable_hide_scrollbar,
		},
	} = usePreferences()

	const isSettings = useMemo(() => location.pathname.includes('settings'), [location.pathname])
	// const displaySideBar = !!enable_double_sidebar && isSettings

	useEffect(() => {
		if (!isLoading && !library) {
			navigate('/404')
		}
	}, [isLoading, library, navigate])

	const renderHeader = () => (isSettings ? <LibrarySettingsHeader /> : <LibraryHeader />)

	if (isLoading || !library) return null

	return (
		<LibraryContext.Provider value={{ library, stats }}>
			<div className="relative flex flex-1 flex-col">
				{renderHeader()}

				{!isSettings && <LibraryNavigation />}

				{/* TODO: animate this sidebar entering... */}
				{isSettings && <LibrarySettingsSidebar />}

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 p-0 md:pb-0', {
						'md:hide-scrollbar': !!enable_hide_scrollbar,
						'ml-48': isSettings,
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
