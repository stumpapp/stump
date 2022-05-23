import React from 'react';
import SeriesCard from './SeriesCard';

interface Props {
	series: SeriesWithMedia[];
}

export default function SeriesGrid({ series }: Props) {
	return (
		<div className="p-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
			{series.map((s) => (
				<SeriesCard key={s.id} {...s} />
			))}
		</div>
	);
}
