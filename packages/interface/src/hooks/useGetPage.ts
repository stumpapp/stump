import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useGetPage() {
	const [search, setSearchParams] = useSearchParams();

	const page = useMemo(() => {
		const searchPage = search.get('page');

		if (searchPage) {
			return parseInt(searchPage, 10);
		}

		return 1;
	}, [search]);

	function setPage(page: number) {
		search.set('page', page.toString());
		setSearchParams(search);
	}

	return { page, setPage };
}
