import { Box, Text } from '@chakra-ui/react';
import React from 'react';
import { Link } from 'react-router-dom';
import client from '~api/client';
import { getSeriesById, getSeriesThumbnail } from '~api/query/series';
import pluralizeStat from '~util/pluralize';

interface Props extends Series {}
// TODO: figure out overflow stuff for the way this is styled. really long titles are a problem.
export default function SeriesCard({ ...series }: Props) {
	const prefetchSeries = async () => {
		await client.prefetchQuery(['getSeries', series.id], () => getSeriesById(series.id), {
			staleTime: 10 * 1000,
		});
	};

	return (
		<Link
			to={`/series/${series.id}`}
			className="rounded-md rounded-t-md border border-transparent hover:border-brand  bg-gray-800 transition-all duration-200"
			onMouseEnter={prefetchSeries}
		>
			<Box px={1.5}>
				<img
					id={String(series.id)}
					alt={`${series.name} thumbnail`}
					className="h-72 w-[12rem] object-cover"
					src={getSeriesThumbnail(series.id)}
					onError={(err) => {
						// @ts-ignore
						err.target.src = '/src/favicon.png';
					}}
				/>
			</Box>

			<Box p={2}>
				<h3 className="text-gray-100 max-w-[11.5rem]">{series.name}</h3>
				<Text>{pluralizeStat('book', series.bookCount)}</Text>
			</Box>
		</Link>
	);
}
