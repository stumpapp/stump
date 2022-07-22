import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getNextInSeries } from '~api/series';
import Button from '~ui/Button';

interface Props {
	seriesId: string;
}

export default function UpNextButton({ seriesId }: Props) {
	const {
		data: media,
		isLoading,
		isFetching,
	} = useQuery(['getNextInSeries', seriesId], () =>
		getNextInSeries(seriesId).then((res) => res.data),
	);

	// TODO: Change this once Stump supports epub progress tracking.
	if (media?.extension === 'epub') {
		return null;
	}

	return (
		<Button
			isDisabled={!isLoading && !isFetching && !media}
			as={Link}
			to={`/books/${media?.id}/pages/${media?.currentPage || 1}`}
			disabled={!media}
			title={`Continue reading ${media?.name || 'from where you left off'}`}
			colorScheme="brand"
		>
			Continue
		</Button>
	);
}
