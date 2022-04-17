import React from 'react';
import { Box } from '@chakra-ui/react';
import client from '~api/client';
import { getMediaById, getMediaThumbnail } from '~api/query/media';

interface Props extends MediaWithProgress {}

export default function MediaCard({ ...media }: Props) {
	const prefetchMedia = async () =>
		await client.prefetchQuery(['getMediaById', media.id], () => getMediaById(media.id), {
			staleTime: 10 * 1000,
		});

	return (
		<a
			href={`/books/${media.id}`}
			className="hover:border-brand rounded-md rounded-t-md border border-transparent bg-gray-800 transition-all duration-200"
			onMouseEnter={prefetchMedia}
		>
			<Box px={1.5}>
				<img
					id={String(media.id)}
					alt={`${media.name} thumbnail`}
					className="h-72 w-auto max-w-[12rem] object-scale-down"
					src={getMediaThumbnail(media.id)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
				/>
			</Box>

			<div className="max-w-[11.5rem] p-2">
				<h3 title={media.name} className="text-gray-100">
					{media.name}
				</h3>
			</div>
		</a>
	);
}
