import { Progress } from '@chakra-ui/react'
import { getSeriesThumbnail } from '@stump/api'
import { prefetchSeries } from '@stump/client'
import { Text } from '@stump/components'
import { Series } from '@stump/types'

import pluralizeStat from '../../utils/pluralize'
import Card, { CardBody, CardFooter } from '../Card'

export type SeriesCardProps = {
	series: Series
	fixed?: boolean
}

export default function SeriesCard({ series, fixed }: SeriesCardProps) {
	const bookCount = Number(series.media ? series.media.length : series.media_count ?? 0)
	const unreadCount = series.unread_media_count

	return (
		<Card
			variant={fixed ? 'fixedImage' : 'image'}
			to={`/series/${series.id}`}
			onMouseEnter={() => prefetchSeries(series.id)}
			title={series.name}
		>
			<CardBody
				// p={0}
				className="relative aspect-[2/3] bg-cover bg-center"
				style={{
					backgroundImage: `url('${getSeriesThumbnail(series.id)}')`,
				}}
			>
				{!!unreadCount && Number(unreadCount) !== bookCount && (
					<div className="absolute bottom-0 left-0 w-full">
						<Progress
							value={bookCount - Number(unreadCount)}
							max={bookCount}
							w="full"
							size="xs"
							colorScheme="brand"
						/>
					</div>
				)}
			</CardBody>
			<CardFooter className="flex flex-col gap-1 p-1">
				{/* TODO: figure out how to make this not look like shit with 2 lines */}
				<Text size="sm" className="font-md" noOfLines={1}>
					{series.name}
				</Text>

				<Text size="xs" className="text-gray-700 dark:text-gray-300">
					{pluralizeStat('book', Number(bookCount))}
				</Text>
			</CardFooter>
		</Card>
	)
}
