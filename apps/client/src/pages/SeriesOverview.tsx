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
					<Button title="Continue from where you left off" colorScheme="brand">
						Continue
					</Button>
					<IconButton size="md" title="Download series as ZIP archive">
						<CloudArrowDown size="1.25rem" />
					</IconButton>
				</ButtonGroup>

				<Text>
					{series.description}
					{/* PRESS START ON A BRAND-NEW MARVEL UNIVERSE! Showered with worldwide acclaim, the
					blockbuster Marvel’s Spider-Man has everyone’s spider-sense buzzing! Now you can
					experience the emotional and shock-filled story that takes favorite characters (including
					Mary Jane, Aunt May, Norman Osborn, Otto Octavius and Miles Morales) and spins them into
					an all-new and unexpected web of drama, spectacle, and classic Spidey action in the Mighty
					Marvel Manner… with more original stories to come! After years of seeing Wilson Fisk
					escape criminal prosecution, the wise-cracking web-slinger finally has the opportunity to
					team with the PDNY to help them arrest his fearsome foe. But when the Kingpin of Crime is
					removed from the mean streets of the Big Apple, how will the mysterious Mister Negative’s
					ascent to power bring Peter Parker’s civilian world and Spider-Man’s superhuman worlds
					crashing together? Plus: All-new story moments never seen in the game and bonus
					behind-the-scenes content! */}
				</Text>
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
