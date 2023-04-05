import { useSeriesByIdQuery } from '@stump/client'
import { Link } from '@stump/components'
import { Series } from '@stump/types'

import SeriesLibraryLink from '../series/SeriesLibraryLink'

type Props = {
	libraryId?: string
	series?: Series | null
	seriesId: string
}

export default function BookLibrarySeriesLinks({ libraryId, seriesId, series }: Props) {
	const { series: fetchedSeries } = useSeriesByIdQuery(seriesId, { enabled: !!series })

	const resolvedSeries = series || fetchedSeries
	const resolvedLibraryId = libraryId || resolvedSeries?.library_id

	const renderSeriesLink = () => {
		if (!resolvedSeries) {
			return null
		}

		return (
			<>
				<span className="mx-2 text-gray-500 dark:text-gray-450">/</span>
				<Link href={`/series/${resolvedSeries.id}`} className="line-clamp-1">
					{resolvedSeries.name}
				</Link>
			</>
		)
	}

	return (
		<div className="flex items-center text-sm md:text-base">
			{resolvedLibraryId && <SeriesLibraryLink id={resolvedLibraryId} />}
			{renderSeriesLink()}
		</div>
	)
}
