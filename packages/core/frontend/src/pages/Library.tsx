import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/query/library';
import { Helmet } from 'react-helmet';
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
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>
			<div className="p-4 flex flex-wrap gap-4 items-center justify-center md:justify-start">
				{library.series.map((s) => (
					<SeriesCard key={s.id} {...s} />
				))}
			</div>
		</>
	);
}
