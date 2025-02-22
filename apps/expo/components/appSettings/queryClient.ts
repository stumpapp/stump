import { QueryClient } from '@tanstack/react-query'

export const settingsQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			suspense: true,
			useErrorBoundary: false,
		},
	},
})
