import { Library, PageInfo } from '@stump/core';
import { useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { getLibraries } from '~api/library';

export function useLibraries() {
	const { data, ...rest } = useQuery(['getLibraries'], getLibraries, {
		// Send all non-401 errors to the error page
		useErrorBoundary: (err: AxiosError) => !err || (err.response?.status ?? 500) !== 401,
	});

	const { libraries, pageData } = useMemo<{ libraries: Library[]; pageData?: PageInfo }>(() => {
		if (data?.data) {
			return {
				libraries: data.data.data,
				pageData: data.data._page,
			};
		}

		return { libraries: [] };
	}, [data]);

	return {
		libraries,
		pageData,
		...rest,
	};
}
