import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { getSeriesMedia } from '~api/query/series';

interface Options {
	// sortBy
	page: number;
}

const defaultOptions: Options = {
	page: 0,
};

export function useSeriesMedia(seriesId: string) {
	const [search, setSearchParams] = useSearchParams();

	// const [media, setMedia] = useState<Media[]>([]);
	// const [pageData, setPageData] = useState<PageInfo>();

	const page = useMemo(() => {
		const searchPage = search.get('page');

		if (searchPage) {
			return parseInt(searchPage, 10);
		}

		return 0;
	}, [search]);

	const { isLoading, isFetching, isPreviousData, data } = useQuery(
		['getSeriesMedia', page],
		() => getSeriesMedia(seriesId, page),
		{
			keepPreviousData: true,
		},
	);

	const { media, pageData } = useMemo(() => {
		if (data?.data) {
			return {
				media: data.data.data,
				pageData: data.data._page,
			};
		}

		return {};
	}, [data]);

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
		[page, media, pageData],
	);

	return { isLoading, isFetching, isPreviousData, media, pageData, actions };
}
