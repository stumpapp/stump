import React from 'react';
import client from '~api/client';
import { getMediaById, getMediaThumbnail } from '~api/query/media';
import Card from '~components/Card';

interface Props extends Media {}

export default function MediaCard({ ...media }: Props) {
	const prefetchMedia = async () =>
		client.prefetchQuery(['getMediaById', media.id], () => getMediaById(media.id), {
			staleTime: 10 * 1000,
		});

	return (
		<Card
			to={`/books/${media.id}`}
			imageAlt={media.name}
			imageSrc={getMediaThumbnail(media.id)}
			onMouseEnter={prefetchMedia}
			title={media.name}
		/>
	);
}
