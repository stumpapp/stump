import { QueryClient } from '@tanstack/react-query'

export { QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			retry: false,
		},
	},
})

export const PREFETCH_STALE_TIME = 1000 * 60 * 1 // 1 minutes
