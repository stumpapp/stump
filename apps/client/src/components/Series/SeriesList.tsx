import { Heading } from '@chakra-ui/react';
import React from 'react';
import ListItem from '~components/ListItem';

interface Props {
	isLoading: boolean;
	series?: Series[];
}

export default function SeriesList({ series, isLoading }: Props) {
	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!series || !series.length) {
		return (
			<div className="flex flex-1 items-center justify-center">
				{/* TODO: If I take in pageData, I can determine if it is an out of bounds issue or if the series truly has
				no media. */}
				<Heading size="sm">It doesn't look like there are any series here.</Heading>
			</div>
		);
	}

	return (
		<div className="flex flex-col space-y-2 flex-1">
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
