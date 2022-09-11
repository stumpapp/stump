import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/library';
import { Helmet } from 'react-helmet';
import { useViewMode } from '~hooks/useViewMode';
import SeriesGrid from '~components/Series/SeriesGrid';
import SeriesList from '~components/Series/SeriesList';
import { useLibrarySeries } from '~hooks/useLibrarySeries';
import Pagination from '~ui/Pagination';
import useIsInView from '~hooks/useIsInView';

// FIXME: there is the *slightest* over stutter here when switching between
// libraries, it's really kinda sorta irritating. I think react-query doesn't
// pick up that it needs to rerun the query fast enough. TODO: see if this happens
// outside development.
export default function LibraryOverview() {
	const containerRef = useRef<HTMLDivElement>();
	const isInView = useIsInView(containerRef);

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

	const { isLoading: isLoadingSeries, series, pageData } = useLibrarySeries(id);

	useEffect(() => {
		if (!isInView) {
			containerRef.current?.scrollIntoView();
		}
	}, [pageData?.currentPage]);

	if (isLoading) {
		return null;
	} else if (!library) {
		throw new Error('Library not found');
	}

	const { viewAsGrid } = useViewMode();

	return (
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			{/* @ts-ignore */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<div className="p-4 w-full h-full flex flex-col space-y-6">
				<Pagination pages={pageData?.totalPages!} currentPage={pageData?.currentPage!} />
				{viewAsGrid ? (
					<SeriesGrid isLoading={isLoadingSeries} series={series} />
				) : (
					<SeriesList isLoading={isLoadingSeries} series={series} />
				)}
				<Pagination
					position="bottom"
					pages={pageData?.totalPages!}
					currentPage={pageData?.currentPage!}
				/>
			</div>
		</>
	);
}
