import { QueryClientProvider } from '@tanstack/react-query'
import { PropsWithChildren } from 'react'

import { queryClient } from './client'
import { IStumpClientContext, QueryClientContext, StumpClientContext } from './context'

export function StumpClientContextProvider({
	children,
	...context
}: PropsWithChildren<IStumpClientContext>) {
	return (
		<StumpClientContext.Provider value={context}>
			<QueryClientContext.Provider value={queryClient}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</QueryClientContext.Provider>
		</StumpClientContext.Provider>
	)
}
