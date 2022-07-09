import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById, getSeriesThumbnail } from '~api/query/series';
import { useSeriesMedia } from '~hooks/useSeriesMedia';
import { useViewMode } from '~hooks/useViewMode';
import MediaGrid from '~components/Media/MediaGrid';
import MediaList from '~components/Media/MediaList';
import Pagination from '~components/ui/Pagination';
import useIsInView from '~hooks/useIsInView';
import { Box, ButtonGroup, Heading, Text } from '@chakra-ui/react';
import Button, { IconButton } from '~components/ui/Button';
import { CloudArrowDown } from 'phosphor-react';
import UpNextButton from '~components/Series/UpNextButton';
import DownloadSeriesButton from '~components/Series/DownloadSeriesButton';
import ReadMore from '~components/ui/ReadMore';

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
							// onError={(_) => {
							// 	on();
							// }}
						/>
					</Box>
				</Box>
			</div>
			<div className="flex-1 flex flex-col space-y-4">
				<Heading size="sm" noOfLines={1}>
					{series.name}
				</Heading>
				<ButtonGroup>
					<UpNextButton seriesId={series.id} />
					<DownloadSeriesButton seriesId={series.id} />
				</ButtonGroup>

				<ReadMore
					// text={`Mark Millar, the best-selling writer behind The Ultimates and Ultimate X-Men, presents his
					// definitive take on Marvel Comics' greatest hero. During Peter's pulse-pounding search for
					// Aunt May, Millar offers his unique perspective on such classic Spider-Man foes as Doctor
					// Octopus and the Vulture - and an all-new, vicious Venom. Fan-favorite artists Terry Dodson
					// and Frank Cho superbly illustrate Millar's tale, contributing modern redesigns for several
					// Spider-Man villains - as well as an unforgettable take on the classic Spidey femme fatale,
					// the Black Cat.\n
					// Marvel Knights Spider-Man features one of comics' most inventive writers matched with an
					// iconic Marvel hero. The result is a spellbinding story from start to finish, a must-have
					// read for any Spider-Man fan!`}
					text={series.description}
				/>
			</div>
		</div>
	);
}

export default function SeriesOverview() {
	const containerRef = useRef<HTMLDivElement>();

	const isInView = useIsInView(containerRef);

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

	useEffect(() => {
		if (!isInView) {
			containerRef.current?.scrollIntoView({
				block: 'nearest',
				inline: 'start',
			});
		}
	}, [pageData?.currentPage]);

	if (isLoadingSeries || isFetchingSeries) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<div className="h-full w-full">
			<Helmet>
				<title>Stump | {series.name}</title>
			</Helmet>

			<OverviewTitleSection series={series} isVisible={pageData?.currentPage === 1} />

			{/* @ts-ignore */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />
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
		</div>
	);
}
