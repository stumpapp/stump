import { useLibraryByIdQuery, usePreferences } from '@stump/client'
import { cn } from '@stump/components'
import React from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'

import { LibraryContext } from './context'
import LibraryHeader from './LibraryHeader'
import LibraryNavigation from './LibraryNavigation'

export default function LibraryLayout() {
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const { isLoading, library } = useLibraryByIdQuery(id)
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	useEffect(() => {
		if (!isLoading && !library) {
			navigate('/404')
		}
	}, [isLoading, library, navigate])

	if (isLoading || !library) return null

	return (
		<LibraryContext.Provider value={{ library }}>
			<LibraryHeader />
			<LibraryNavigation />

			<SceneContainer
				className={cn(
					'relative flex flex-col gap-4 p-0 md:h-full md:pb-0',
					// {
					// 	'md:overflow-hidden': isOnOverview,
					// },
					// { 'md:h-full md:overflow-y-auto': !isOnOverview },
					{ 'md:hide-scrollbar': !!enable_hide_scrollbar },
				)}
			>
				<Suspense fallback={null}>
					<Outlet />
				</Suspense>
			</SceneContainer>
		</LibraryContext.Provider>
	)
}
