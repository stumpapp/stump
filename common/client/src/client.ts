import { QueryClient } from '@tanstack/react-query';

export * from './operations';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
			suspense: true,
		},
	},
});
