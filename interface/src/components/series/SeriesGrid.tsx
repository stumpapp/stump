import { CardGrid } from '@stump/components'
import { type Series } from '@stump/types'

import GenericEmptyState from '../GenericEmptyState'
import SeriesCard from './SeriesCard'

interface Props {
	isLoading: boolean
	series?: Series[]
	hasFilters?: boolean
}

export default function SeriesGrid({ series, isLoading, hasFilters }: Props) {
	if (isLoading) {
		return null
	} else if (!series || !series.length) {
		return (
			<GenericEmptyState
				title={
					hasFilters
						? 'No series match your search'
						: "It doesn't look like there are any series here"
				}
				subtitle={
					hasFilters
						? 'Try removing some filters to see more series'
						: 'Try adding some series to your library'
				}
			/>
		)
	}

	return (
		<CardGrid>
			{series.map((s) => (
				<SeriesCard key={s.id} series={s} />
			))}
		</CardGrid>
	)
}
