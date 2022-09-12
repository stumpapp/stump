import { QueryClient, useQuery } from '@tanstack/react-query';
import { API } from './api';
import { startUpQuery } from './api/init';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
			suspense: true,
		},
	},
});

export function useStartUpQuery() {
	console.log('useStartUpQuery', API.getUri());
	return useQuery(['startUp'], startUpQuery, {});
}
