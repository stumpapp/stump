import { Heading } from '@chakra-ui/react';

import SeriesCard from './SeriesCard';

import type { Series } from '@stump/client';
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
		<div className="flex-1 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-4 2xl:gap-2 2xl:grid-cols-8 3xl:grid-cols-9 items-start justify-center md:justify-start pb-4">
			{series.map((s) => (
				<SeriesCard key={s.id} {...s} />
			))}
		</div>
	);
}
