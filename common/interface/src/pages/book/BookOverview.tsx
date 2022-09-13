import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';

import { useMedia } from '@stump/client';
import { getMediaPage, getMediaThumbnail } from '@stump/client/api';

import Card from '../../components/Card';

export default function BookOverview() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Book id is required for this route.');
	}

	const { media, isLoading } = useMedia(id);

	const fallback = useMemo(() => {
		// if (media.extension === 'epub') {
		// 	return '/fallbacks/epub.png';
		// }

		return '/fallbacks/image-file.svg';
	}, [media?.extension]);

	function prefetchCurrentPage() {
		if (!media) {
			return;
		}

		const currentPage = media.currentPage ?? 1;

		const img = new Image();
		img.src = getMediaPage(media.id, currentPage);
	}

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
			<div className="p-4 flex">
				<Card
					to={`/books/${media.id}/pages/${media.currentPage ?? 1}`}
					imageAlt={media.name}
					imageSrc={getMediaThumbnail(media.id)}
					imageFallback={fallback}
					onMouseEnter={prefetchCurrentPage}
					title={media.name}
					variant="large"
				/>
			</div>
		</>
	);
}
