import { Heading } from '@chakra-ui/react';

import SeriesCard from './SeriesCard';

import type { Series } from '@stump/client';
import { CardGrid } from '../Card';

interface Props {
	isLoading: boolean;
	series?: Series[];
}

// TODO: I think this *might* need a redesign... Not sure, gotta do some UX research about this
export default function SeriesGrid({ series, isLoading }: Props) {
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
		<CardGrid>
			{series.map((s) => (
				<SeriesCard key={s.id} series={s} />
			))}
		</CardGrid>
	);
}
