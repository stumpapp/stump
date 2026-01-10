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

export const ALPHABET_STALE_TIME = 1000 * 60 * 60 * 24 * 7 // 1 week
