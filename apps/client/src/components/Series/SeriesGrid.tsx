import React from 'react';
import SeriesCard from './SeriesCard';

interface Props {
	series: Series[];
}

// TODO: I think this *might* need a redesign... Not sure, gotta do some UX research about this
export default function SeriesGrid({ series }: Props) {
	return (
		<div className="p-4 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:gap-2 2xl:grid-cols-8 3xl:grid-cols-9 items-center justify-center md:justify-start">
			{series.map((s) => (
				<SeriesCard key={s.id} {...s} />
			))}
		</div>
	);
}
