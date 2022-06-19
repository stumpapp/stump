import React from 'react';
import Pagination from '~components/ui/Pagination';
import { useSeriesMedia } from '~hooks/useSeriesMedia';
import MediaCard from './MediaCard';

interface Props {
	// media: Media[];
	seriesId: string;
}

// TODO: I think this *might* need a redesign... Not sure, gotta do some UX research about this
export default function MediaGrid({ seriesId }: Props) {
	const { isLoading, media, pageData } = useSeriesMedia(seriesId);

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!media) {
		return <div>whoop</div>;
	}

	return (
		<div className="p-4 w-full h-full flex flex-col space-y-6">
			<Pagination pages={10} currentPage={pageData?.currentPage!} />
			<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:gap-2 2xl:grid-cols-8 3xl:grid-cols-9 items-center justify-center md:justify-start">
				{media.map((s) => (
					<MediaCard key={s.id} {...s} />
				))}
			</div>
		</div>
	);
}
