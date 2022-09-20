import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';

import { Spacer } from '@chakra-ui/react';
import { useLayoutMode, useLibrary, useLibrarySeries } from '@stump/client';

import SeriesGrid from '../../components/series/SeriesGrid';
import SeriesList from '../../components/series/SeriesList';
import useIsInView from '../../hooks/useIsInView';
import Pagination from '../../ui/Pagination';
import { useGetPage } from '../../hooks/useGetPage';

export default function LibraryOverview() {
	const [containerRef, isInView] = useIsInView<HTMLDivElement>();

	const { id } = useParams();
	const { page } = useGetPage();

	if (!id) {
		throw new Error('Library id is required');
	}

	function handleError(err: unknown) {
		console.error(err);
	}

	const { isLoading, library } = useLibrary(id, { onError: handleError });

	const { isLoading: isLoadingSeries, series, pageData } = useLibrarySeries(id, page);

	useEffect(() => {
		if (!isInView) {
			containerRef.current?.scrollIntoView();
		}
	}, [pageData?.current_page]);

	if (isLoading) {
		return null;
	} else if (!library) {
		throw new Error('Library not found');
	}

	const { layoutMode } = useLayoutMode('LIBRARY');

	return (
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			{/* @ts-ignore */}
			<section ref={containerRef} id="grid-top-indicator" className="h-0" />

			<div className="p-4 w-full h-full flex flex-col space-y-6">
				<Pagination pages={pageData?.total_pages!} currentPage={pageData?.current_page!} />

				{layoutMode === 'GRID' ? (
					<SeriesGrid isLoading={isLoadingSeries} series={series} />
				) : (
					<SeriesList isLoading={isLoadingSeries} series={series} />
				)}

				<Spacer />

				<Pagination
					position="bottom"
					pages={pageData?.total_pages!}
					currentPage={pageData?.current_page!}
				/>
			</div>
		</>
	);
}
