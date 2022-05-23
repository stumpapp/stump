import React from 'react';
import MediaCard from './MediaCard';

interface Props {
	media: MediaWithProgress[];
}

export default function MediaGrid({ media }: Props) {
	return (
		<div className="p-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
			{media.map((s) => (
				<MediaCard key={s.id} {...s} />
			))}
		</div>
	);
}
