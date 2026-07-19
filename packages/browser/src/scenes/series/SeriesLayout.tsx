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
			stats {
				bookCount
				completedBooks
				inProgressBooks
				totalBytes
				totalReadingTimeSeconds
			}
			tags {
				id
				name
			}
			thumbnail {
				url
				metadata {
					averageColor
					thumbhash
					colors {
						color
						percentage
					}
				}
			}
			createdAt
			updatedAt
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
	const {
		preferences: { enableHideScrollbar },
	} = usePreferences()

	useEffect(() => {
		if (!series) {
			navigate('/404')
		}
	}, [series, navigate])

	if (!series) return null

	// TODO: conditional render header, conform to library layout patterns (e.g., settings header + settings sidebar, etc)
	return (
		<SeriesContext.Provider value={{ series }}>
			<div className="relative flex flex-1 flex-col">
				<SeriesHeader />

				<SceneContainer
					className={cn('gap-4 p-0 md:pb-0 relative flex flex-1 flex-col', {
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
