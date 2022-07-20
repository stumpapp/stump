import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { getLibrarySeries } from '~api/library';

// interface Options {
// 	// sortBy
// 	page: number;
// }

export function useLibrarySeries(libraryId: string) {
	const [search, setSearchParams] = useSearchParams();

	const page = useMemo(() => {
		const searchPage = search.get('page');

		if (searchPage) {
			return parseInt(searchPage, 10);
		}

		return 1;
	}, [search]);

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getLibrarySeries', page, libraryId],
		() => getLibrarySeries(libraryId, page),
		{
			keepPreviousData: true,
		},
	);

	const { series, pageData } = useMemo(() => {
		if (data?.data) {
			return {
				series: data.data.data,
				pageData: data.data._page,
			};
		}

		return {};
	}, [data]);

	// Note: I am leaving these here for now, but I think they should be removed.
	// The Pagination.tsx component will use navigation to handle pagination, so these
	// manual actions aren't really necessary.
	const actions = useMemo(
		() => ({
			hasMore() {
				return !!pageData && page + 1 < pageData.totalPages;
			},
			next() {
				if (actions.hasMore()) {
					search.set('page', (page + 1).toString());
					setSearchParams(search);
				}
			},
		}),
		[page, series, pageData],
	);

	return { isLoading, isFetching, isPreviousData, series, pageData, actions };
}
