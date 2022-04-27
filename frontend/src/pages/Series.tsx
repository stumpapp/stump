import { Wrap, WrapItem } from '@chakra-ui/react';
import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getSeriesById } from '~api/query/series';
import MediaCard from '~components/Media/MediaCard';

export default function Series() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	const { isLoading, data: series } = useQuery('getSeries', {
		queryFn: async () => getSeriesById(id).then((res) => res.data),
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!series) {
		throw new Error('Series not found');
	}

	return (
		<div className="flex flex-col space-y-4 p-4">
			<h1 className="text-lg font-bold text-gray-100">{series.name}</h1>

			{/* <div className="flex flex-wrap gap-4 items-center justify-center"> */}
			<Wrap align="center">
				{series.media.map((m) => (
					<WrapItem>
						<MediaCard {...m} />
					</WrapItem>
				))}
			</Wrap>
			{/* </div> */}
		</div>
	);
}
