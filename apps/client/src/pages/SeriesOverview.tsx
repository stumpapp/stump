import React from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById } from '~api/query/series';
import { useSeriesMedia } from '~hooks/useSeriesMedia';
import { useViewMode } from '~hooks/useViewMode';
import MediaGrid from '~components/Media/MediaGrid';
import MediaList from '~components/Media/MediaList';
import Pagination from '~components/ui/Pagination';

export default function SeriesOverview() {
	const { id } = useParams();

	const { viewAsGrid } = useViewMode();

	if (!id) {
		throw new Error('Library id is required');
	}

	const {
		isLoading: isLoadingSeries,
		isFetching: isFetchingSeries,
		data: series,
	} = useQuery('getSeries', {
		queryFn: async () => getSeriesById(id).then((res) => res.data),
	});

	const { isLoading: isLoadingMedia, media, pageData } = useSeriesMedia(id);

	if (isLoadingSeries || isFetchingSeries) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<>
			<Helmet>
				<title>Stump | {series.name}</title>
			</Helmet>

			<div className="p-4 w-full h-full flex flex-col space-y-6">
				<Pagination pages={pageData?.totalPages!} currentPage={pageData?.currentPage!} />
				{viewAsGrid ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
				)}
				<Pagination
					position="bottom"
					pages={pageData?.totalPages!}
					currentPage={pageData?.currentPage!}
				/>
			</div>
		</>
	);
}
