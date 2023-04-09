import { CardGrid, Heading } from '@stump/components'
import { type Series } from '@stump/types'

import SeriesCard from './SeriesCard'

interface Props {
	isLoading: boolean
	series?: Series[]
}

export default function SeriesGrid({ series, isLoading }: Props) {
	if (isLoading) {
		return null
	} else if (!series || !series.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Heading size="sm">It doesn&rsquo;t look like there are any series here.</Heading>
			</div>
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
