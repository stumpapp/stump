import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';

import { useMedia, useTopBarStore } from '@stump/client';
// import { getMediaPage, getMediaThumbnail } from '@stump/client/api';
import MediaCard from '../../components/media/MediaCard';
import { DEBUG_ENV } from '../..';
import { Box, ButtonGroup, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import ReadMore from '../../ui/ReadMore';
import TagList from '../../components/tags/TagList';
import { formatBytes } from '../../utils/format';

// TODO: looks shit on mobile
export default function BookOverview() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Book id is required for this route.');
	}

	const { media, isLoading } = useMedia(id);
	const { setBackwardsUrl } = useTopBarStore();

	useEffect(() => {
		if (media?.series) {
			setBackwardsUrl(`/libraries/${media.series.id}`);
		}

		return () => {
			setBackwardsUrl();
		};
	}, [media?.series?.id]);

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!media) {
		throw new Error('Media not found');
	}

	return (
		<>
			<Helmet>
				<title>Stump | {media.name ?? ''}</title>
			</Helmet>
			<div className="p-4 h-full w-full flex flex-col space-y-3">
				<div className="flex items-start space-x-4">
					<MediaCard media={media} readingLink />
					<div className="flex-1 flex flex-col space-y-4 h-full">
						<ButtonGroup>
							{/* <UpNextButton seriesId={series.id} /> */}
							{/* <DownloadSeriesButton seriesId={series.id} /> */}
						</ButtonGroup>

						<ReadMore text={media.description} />

						{/* TODO: I want this at the bottom of the container here, but layout needs to be tweaked and I am tired. */}
						<TagList tags={media.tags} />
					</div>
				</div>

				<div className="flex flex-col space-y-2 text-sm pt-2">
					<Heading fontSize="md">File Information</Heading>
					<Box className="flex space-x-4" color={useColorModeValue('gray.700', 'gray.400')}>
						<Text>Size: {formatBytes(media.size)}</Text>
						<Text>Kind: {media.extension.toUpperCase()}</Text>
					</Box>
					<Text color={useColorModeValue('gray.700', 'gray.400')}>Checksum: {media.checksum}</Text>
				</div>

				{/* TODO: series slider, cursor after current? */}
			</div>
		</>
	);
}
