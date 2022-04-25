import React from 'react';
import { Box, Text } from '@chakra-ui/react';
import client from '~api/client';
import { getMediaById, getMediaThumbnail } from '~api/query/media';

interface Props extends MediaWithProgress {}

export default function MediaCard({ ...media }: Props) {
	const prefetchMedia = async () =>
		client.prefetchQuery(['getMediaById', media.id], () => getMediaById(media.id), {
			staleTime: 10 * 1000,
		});

	// TODO: change background color, it is not distinguishable enough from
	// the background (gray.800 vs gray.900)
	return (
		<Box
			as="a"
			shadow="base"
			bg="gray.50"
			border="1.5px solid"
			borderColor="transparent"
			_dark={{ bg: 'gray.800' }}
			_hover={{
				borderColor: 'brand.500',
			}}
			href={`/books/${media.id}`}
			rounded="md"
			// className="hover:border-brand rounded-md rounded-t-md border border-transparent transition-all duration-200"
			onMouseEnter={prefetchMedia}
		>
			<Box px={1.5}>
				<img
					id={String(media.id)}
					alt={`${media.name} thumbnail`}
					className="h-72 w-[12rem] object-scale-down"
					src={getMediaThumbnail(media.id)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
				/>
			</Box>

			<div className="max-w-[11.5rem] p-2">
				<Text size="sm" as="h3" color="black" _dark={{ color: 'gray.100' }}>
					{media.name}
				</Text>
			</div>
		</Box>
	);
}
