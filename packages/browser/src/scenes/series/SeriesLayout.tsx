import { useSeriesByIdQuery } from '@stump/client'
import { cn } from '@stump/components'
import React from 'react'
import { Suspense, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import { usePreferences } from '@/hooks'

import { SeriesContext } from './context'
import SeriesHeader from './SeriesHeader'
import SeriesNavigation from './SeriesNavigation'

export default function SeriesLayout() {
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const { series, isLoading } = useSeriesByIdQuery(id, {
		params: {
			load_library: true,
		},
	})
	// TODO: stats
	// const { stats } = useSeriesStats({ cacheTime: 1000 * 60 * 5, id })
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	useEffect(() => {
		if (!isLoading && !series) {
			navigate('/404')
		}
	}, [isLoading, series, navigate])

	if (isLoading || !series) return null

	return (
		<SeriesContext.Provider value={{ series }}>
			<div className="relative flex flex-1 flex-col">
				<SeriesHeader />
				<SeriesNavigation />

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 p-0 md:pb-0', {
						'md:hide-scrollbar': !!enable_hide_scrollbar,
					})}
				>
					<Suspense fallback={null}>
						<Outlet />
					</Suspense>
				</SceneContainer>
			</div>
		</SeriesContext.Provider>
	)
}
