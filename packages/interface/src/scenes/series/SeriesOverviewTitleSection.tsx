import { getSeriesThumbnail } from '@stump/api'
import { EntityCard, Heading } from '@stump/components'
import { Series } from '@stump/types'

import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'
import DownloadSeriesButton from './DownloadSeriesButton'
import SeriesLibraryLink from './SeriesLibraryLink'
import UpNextInSeriesButton from './UpNextInSeriesButton'

type Props = {
	isVisible: boolean
	series: Series
}
export default function SeriesOverviewTitleSection({ isVisible, series }: Props) {
	if (!isVisible) {
		return null
	}

	return (
		<div className="flex flex-1 items-start space-x-4 p-4">
			<EntityCard imageUrl={getSeriesThumbnail(series.id)} size="lg" fullWidth={false} />

			<div className="flex flex-1 flex-col gap-3">
				<div>
					<Heading size="sm">{series.name}</Heading>
					<SeriesLibraryLink id={series.library_id} />
				</div>
				<div className="flex items-center gap-2">
					<UpNextInSeriesButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</div>

				<ReadMore text={series.description} />
				<TagList tags={series.tags} />
			</div>
		</div>
	)
}
