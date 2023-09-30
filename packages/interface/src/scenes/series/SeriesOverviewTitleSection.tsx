import { getSeriesThumbnail } from '@stump/api'
import { ButtonOrLink, EntityCard, Heading } from '@stump/components'
import { Series } from '@stump/types'
import { useMediaMatch } from 'rooks'

import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import { useAppContext } from '../../context'
import paths from '../../paths'
import DownloadSeriesButton from './DownloadSeriesButton'
import SeriesLibraryLink from './SeriesLibraryLink'
import UpNextInSeriesButton from './UpNextInSeriesButton'

type Props = {
	series: Series
}
export default function SeriesOverviewTitleSection({ series }: Props) {
	const { isServerOwner } = useAppContext()
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const summary = series.description ?? series.metadata?.summary

	return (
		<div className="flex flex-col items-center gap-4 md:mb-2 md:flex-row md:items-start">
			<EntityCard
				imageUrl={getSeriesThumbnail(series.id)}
				size="lg"
				fullWidth={false}
				className="md:min-w-[16rem]"
			/>

			<div className="flex h-full w-full flex-col gap-2 md:gap-4">
				<div className="flex flex-col items-center text-center md:items-start md:text-left">
					<Heading size="sm">{series.name}</Heading>
					<SeriesLibraryLink id={series.library_id} />
					<TagList tags={series.tags} />
				</div>

				<div className="flex w-full flex-col gap-2 md:flex-row">
					<UpNextInSeriesButton seriesId={series.id} />
					{isServerOwner && (
						<ButtonOrLink variant="subtle" href={paths.seriesManagement(series.id)}>
							Manage
						</ButtonOrLink>
					)}
					<DownloadSeriesButton seriesId={series.id} />
				</div>

				{isAtLeastMedium && !!summary && <ReadMore text={summary} />}
				{!isAtLeastMedium && !!summary && (
					<div>
						<Heading size="xs" className="mb-0.5">
							Summary
						</Heading>
						<ReadMore text={summary} />
					</div>
				)}
			</div>
		</div>
	)
}
