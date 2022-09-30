import { useMemo } from 'react';

import type { Media } from '@stump/client';
import { prefetchMedia } from '@stump/client';
import { getMediaThumbnail } from '@stump/client/api';

import Card from '../Card';

export default function MediaCard(media: Media) {
	const fallback = useMemo(() => {
		return '/fallbacks/image-file.svg';
	}, [media.extension]);

	return (
		<Card
			to={`/books/${media.id}`}
			imageAlt={media.name}
			imageSrc={getMediaThumbnail(media.id)}
			imageFallback={fallback}
			onMouseEnter={() => prefetchMedia(media.id)}
			title={media.name}
			showMissingOverlay={media.status === 'MISSING'}
		/>
	);
}
