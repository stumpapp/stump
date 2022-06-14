import React from 'react';
import MediaCard from './MediaCard';

interface Props {
	media: Media[];
}

export default function MediaGrid({ media }: Props) {
	return (
		<div className="p-4 grid grid-cols-2  md:grid-cols-3  lg:grid-cols-4  xl:grid-cols-5 gap-4 items-center justify-center md:justify-start">
			{media.map((s) => (
				<MediaCard key={s.id} {...s} />
			))}
		</div>
	);
}
