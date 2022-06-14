import React from 'react';
import SeriesCard from './SeriesCard';

interface Props {
	series: Series[];
}

export default function SeriesGrid({ series }: Props) {
	return (
		<div className="p-4 grid grid-cols-2  md:grid-cols-3  lg:grid-cols-4  xl:grid-cols-5 gap-4 items-center justify-center md:justify-start">
			{series.map((s) => (
				<SeriesCard key={s.id} {...s} />
			))}
		</div>
	);
}
