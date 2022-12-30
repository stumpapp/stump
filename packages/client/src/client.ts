import { QueryClient, useQuery as _useQuery } from '@tanstack/react-query';

export * from './queries';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			suspense: true,
		},
	},
});
