import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';

import { Box, ButtonGroup, Heading, Spacer } from '@chakra-ui/react';
import { useLayoutMode, useSeries, useSeriesMedia, useTopBarStore } from '@stump/client';
import { getSeriesThumbnail } from '@stump/client/api';

import MediaGrid from '../components/media/MediaGrid';
import MediaList from '../components/media/MediaList';
import DownloadSeriesButton from '../components/series/DownloadSeriesButton';
import UpNextInSeriesButton from '../components/series/UpNextInSeriesButton';
import { useGetPage } from '../hooks/useGetPage';
import useIsInView from '../hooks/useIsInView';
import Pagination from '../ui/Pagination';
import ReadMore from '../ui/ReadMore';

import type { Series } from '@stump/client';
import TagList from '../components/tags/TagList';

interface OverviewTitleSectionProps {
	isVisible: boolean;
	series: Series;
}

function OverviewTitleSection({ isVisible, series }: OverviewTitleSectionProps) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className="p-4 flex items-start space-x-4">
			<div>
				<Box shadow="base" bg="gray.50" _dark={{ bg: 'gray.750' }} rounded="md" maxW="16rem">
					<Box px={1.5}>
						<img
							className="min-h-96 object-cover w-full [aspect-ratio:663/1024]"
							src={getSeriesThumbnail(series.id)}
						/>
					</Box>
				</Box>
			</div>
			<div className="flex-1 flex flex-col space-y-4 h-full">
				<Heading size="sm" noOfLines={1}>
					{series.name}
				</Heading>
				<ButtonGroup>
					<UpNextInSeriesButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</ButtonGroup>

				<ReadMore text={series.description} />

				{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
				<TagList tags={series.tags} />
			</div>
		</div>
	);
}

export default function SeriesOverview() {
	const [containerRef, isInView] = useIsInView();

	const { id } = useParams();
	const { page } = useGetPage();

	if (!id) {
		throw new Error('Series id is required');
	}

	const { layoutMode } = useLayoutMode('SERIES');
	const { setBackwardsUrl } = useTopBarStore();

	const { series, isLoading: isLoadingSeries } = useSeries(id);

	const { isLoading: isLoadingMedia, media, pageData } = useSeriesMedia(id, page);

	useEffect(() => {
		if (!isInView) {
			containerRef.current?.scrollIntoView({
				block: 'nearest',
				inline: 'start',
			});
		}
	}, [pageData?.current_page]);

	useEffect(() => {
		if (series?.library) {
			setBackwardsUrl(`/libraries/${series.library.id}`);
		}

		return () => {
			setBackwardsUrl();
		};
	}, [series?.library?.id]);

	// FIXME: ugly
	if (isLoadingSeries) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<div className="h-full w-full">
			<Helmet>
				<title>Stump | {series.name}</title>
			</Helmet>

			<OverviewTitleSection series={series} isVisible={pageData?.current_page === 1} />

			{/* @ts-ignore */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />
			<div className="p-4 w-full h-full flex flex-col space-y-6">
				<Pagination pages={pageData?.total_pages!} currentPage={pageData?.current_page!} />
				{layoutMode === 'GRID' ? (
					<MediaGrid isLoading={isLoadingMedia} media={media} />
				) : (
					<MediaList isLoading={isLoadingMedia} media={media} />
				)}

				{/* FIXME: spacing when empty */}
				<Spacer />

				<Pagination
					position="bottom"
					pages={pageData?.total_pages!}
					currentPage={pageData?.current_page!}
				/>
			</div>
		</div>
	);
}
