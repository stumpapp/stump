import { Box, Text } from '@chakra-ui/react';
import React from 'react';
import client from '~api/client';
import { getSeriesById, getSeriesThumbnail } from '~api/query/series';

interface Props extends Series {}

export default function SeriesCard({ ...series }: Props) {
	const prefetchSeries = async () =>
		await client.prefetchQuery(['getSeries', series.id], () => getSeriesById(series.id), {
			staleTime: 10 * 1000,
		});

	return (
		<a
			href={`/series/${series.id}`}
			className="col-span-1 rounded-md rounded-t-md border border-transparent hover:border-brand  bg-gray-800 transition-all duration-200"
			onMouseEnter={prefetchSeries}
		>
			<Box px={1.5}>
				<img
					id={String(series.id)}
					alt={`${series.title} thumbnail`}
					className="h-72 w-auto max-w-[12rem] object-scale-down"
					src={getSeriesThumbnail(series.id)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
				/>
			</Box>

			<Box p={2}>
				<h3 className="text-gray-100">{series.title}</h3>
				<Text>{series.book_count} books</Text>
			</Box>
		</a>
	);
}
