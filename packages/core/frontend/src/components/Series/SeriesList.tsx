import React from 'react';
import ListItem from '~components/ListItem';

interface Props {
	series: SeriesWithMedia[];
}

export default function SeriesList({ series }: Props) {
	return (
		<div className="p-4 flex flex-col space-y-2 flex-1">
			{series.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/series/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	);
}
