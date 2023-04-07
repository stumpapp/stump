import { Heading } from '@chakra-ui/react'
import { getSeriesThumbnail } from '@stump/api'
import { EntityCard, Text } from '@stump/components'
import type { Series } from '@stump/types'
import pluralize from 'pluralize'

import { CardGrid } from '../Card'

interface Props {
	isLoading: boolean
	series?: Series[]
}

// TODO: I think this *might* need a redesign... Not sure, gotta do some UX research about this
export default function SeriesGrid({ series, isLoading }: Props) {
	if (isLoading) {
		return <div>Loading...</div>
	} else if (!series || !series.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				{/* TODO: If I take in pageData, I can determine if it is an out of bounds issue or if the series truly has
				no media. */}
				<Heading size="sm">It doesn&rsquo;t look like there are any series here.</Heading>
			</div>
		)
	}

	const getSubtitle = (series: Series) => {
		// const seriesMedia = series.media || []
		// const booksRead = seriesMedia.filter((m) => m.current_page === m.pages).length
		// const booksLeft = seriesMedia.length - booksRead
		// return (
		// 	<div className="flex items-center gap-1">
		// 		<Text size="xs" variant="muted">
		// 			{booksLeft} of {seriesMedia.length} {pluralize('book', seriesMedia.length)} left
		// 		</Text>
		// 	</div>
		// )

		return (
			<div className="flex items-center gap-1">
				<Text size="xs" variant="muted">
					<>
						{series.media_count} {pluralize('book', Number(series.media_count || 0))}
					</>
				</Text>
			</div>
		)
	}

	return (
		<CardGrid>
			{series.map((s) => (
				<EntityCard
					key={s.id}
					title={s.name}
					href={`/series/${s.id}`}
					imageUrl={getSeriesThumbnail(s.id)}
					// progress={getProgress(media.current_page, media.pages)}
					subtitle={getSubtitle(s)}
				/>
			))}
		</CardGrid>
	)
}
