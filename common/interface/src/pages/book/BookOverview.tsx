import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';

import { useMedia, useTopBarStore } from '@stump/client';
import { getMediaPage, getMediaThumbnail } from '@stump/client/api';

import Card from '../../components/Card';

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

	const fallback = useMemo(() => {
		return '/fallbacks/image-file.svg';
	}, [media?.extension]);

	function prefetchCurrentPage() {
		if (!media) {
			return;
		}

		const currentPage = media.current_page ?? 1;

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
					to={`/books/${media.id}/pages/${media.current_page ?? 1}`}
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
