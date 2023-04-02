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
			<div>
				<span className="mx-2 text-gray-500 dark:text-gray-450">/</span>
				<Link href={`/series/${resolvedSeries.id}`}>{resolvedSeries.name}</Link>
			</div>
		)
	}

	return (
		<div className="flex items-center">
			{resolvedLibraryId && <SeriesLibraryLink id={resolvedLibraryId} />}
			{renderSeriesLink()}
		</div>
	)
}
