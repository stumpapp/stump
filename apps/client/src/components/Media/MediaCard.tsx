import { Media } from '@stump/core';
import React, { useMemo } from 'react';
import client from '~api/client';
import { getMediaById, getMediaThumbnail } from '~api/media';
import Card from '~components/Card';

interface Props extends Media {}

export default function MediaCard(media: Props) {
	const prefetchMedia = async () =>
		client.prefetchQuery(['getMediaById', media.id], () => getMediaById(media.id), {
			staleTime: 10 * 1000,
		});

	const fallback = useMemo(() => {
		// if (media.extension === 'epub') {
		// 	return '/fallbacks/epub.png';
		// }

		return '/fallbacks/image-file.svg';
	}, [media.extension]);

	return (
		<Card
			to={`/books/${media.id}`}
			imageAlt={media.name}
			imageSrc={getMediaThumbnail(media.id)}
			imageFallback={fallback}
			onMouseEnter={prefetchMedia}
			title={media.name}
			showMissingOverlay={media.status === 'MISSING'}
			// showMissingOverlay={media.name.includes('v02')}
		/>
	);
}
