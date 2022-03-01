import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/query/library';
import SeriesCard from '~components/SeriesCard';

export default function Library() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	const { isLoading, data: library } = useQuery('getLibrary', {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!library) {
		throw new Error('Library not found');
	}

	return (
		<div className="flex flex-col space-y-4">
			<h1 className="text-lg font-bold text-gray-100">{library.name}</h1>

			<div className="flex flex-wrap gap-4">
				{library.series.map((s) => (
					<SeriesCard {...s} />
				))}
			</div>
		</div>
	);
}
