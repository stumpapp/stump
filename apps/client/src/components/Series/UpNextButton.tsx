import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { getNextInSeries } from '~api/query/series';
import Button from '~components/ui/Button';

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
