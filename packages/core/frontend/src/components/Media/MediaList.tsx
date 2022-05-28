import React from 'react';
import ListItem from '~components/ListItem';

interface Props {
	media: Media[];
}

export default function MediaList({ media }: Props) {
	return (
		<div className="p-4 flex flex-col space-y-2 flex-1">
			{media.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/books/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	);
}
