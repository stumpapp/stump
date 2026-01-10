import { PREFETCH_STALE_TIME, useSDK, useSuspenseGraphQL } from '@stump/client'
import { cn } from '@stump/components'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { Suspense, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import { usePreferences } from '@/hooks'

import { SeriesContext } from './context'
import SeriesHeader from './SeriesHeader'
import SeriesNavigation from './SeriesNavigation'

const query = graphql(`
	query SeriesLayout($id: ID!) {
		seriesById(id: $id) {
			id
			path
			library {
				id
				name
			}
			resolvedName
			resolvedDescription
			tags {
				id
				name
			}
		}
	}
`)

export const usePrefetchSeries = () => {
	const { sdk } = useSDK()

	const client = useQueryClient()
	return (id: string) =>
		client.prefetchQuery({
			queryKey: ['seriesById', id],
			queryFn: async () => {
				const response = await sdk.execute(query, {
					id,
				})
				return response
			},
			staleTime: PREFETCH_STALE_TIME,
		})
}

export default function SeriesLayout() {
	const navigate = useNavigate()

	const { id } = useParams()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(query, ['seriesById'], { id: id || '' })
	// TODO: stats
	// const { stats } = useSeriesStats({ cacheTime: 1000 * 60 * 5, id })
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	useEffect(() => {
		if (!series) {
			navigate('/404')
		}
	}, [series, navigate])

	if (!series) return null

	return (
		<SeriesContext.Provider value={{ series }}>
			<div className="relative flex flex-1 flex-col">
				<SeriesHeader />
				<SeriesNavigation />

				<SceneContainer
					className={cn('relative flex flex-1 flex-col gap-4 p-0 md:pb-0', {
						'md:hide-scrollbar': !!enableHideScrollbar,
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
