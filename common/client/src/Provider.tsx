import { QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';
import { queryClient } from './client';
import { StumpQueryContext } from './context';

export function StumpQueryProvider({ children }: { children: ReactElement }) {
	return (
		<StumpQueryContext.Provider value={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</StumpQueryContext.Provider>
	);
}
