import React from 'react';
import { useQuery } from 'react-query';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/query/library';
import { Helmet } from 'react-helmet';
import { useViewMode } from '~hooks/useViewMode';
import SeriesGrid from '~components/Series/SeriesGrid';
import SeriesList from '~components/Series/SeriesList';

export default function Library() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	function handleError(err: unknown) {
		console.error(err);
	}

	// [queryKey, id] => refetch on id change
	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
		onError: handleError,
	});

	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!library) {
		throw new Error('Library not found');
	}

	const { viewAsGrid } = useViewMode();

	return (
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			{viewAsGrid ? <SeriesGrid series={library.series} /> : <SeriesList series={library.series} />}
		</>
	);
}
