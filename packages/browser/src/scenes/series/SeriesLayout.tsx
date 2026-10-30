import { useSuspenseGraphQL } from '@stump/client'
import { cn } from '@stump/components'
import { Suspense, useEffect } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'

import { SceneContainer } from '@/components/container'
import { usePreferences } from '@/hooks'

import { SeriesContext } from '../../components/series/context'
import { seriesLayoutQuery } from '../../components/series/queries'
import { SeriesHeader } from '../../components/series/SeriesHeader'

export default function SeriesLayout() {
	const navigate = useNavigate()

	const { id } = useParams()
	const {
		data: { seriesById: series },
	} = useSuspenseGraphQL(seriesLayoutQuery, ['seriesById', id], { id: id || '' })
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
