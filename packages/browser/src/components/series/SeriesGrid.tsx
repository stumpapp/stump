import { CardGrid } from '@stump/components'

import GenericEmptyState from '../GenericEmptyState'
import SeriesCard, { SeriesCardData } from './SeriesCard'

interface Props {
	isLoading: boolean
	series?: SeriesCardData[]
	hasFilters?: boolean
}

export default function SeriesGrid({ series, isLoading, hasFilters }: Props) {
	if (isLoading) {
		return null
	} else if (!series || !series.length) {
		return (
			<div className="grid flex-1 place-self-center">
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
			</div>
		)
	}

	return (
		<CardGrid>
			{series.map((s) => (
				<SeriesCard key={s.id} data={s} />
			))}
		</CardGrid>
	)
}
