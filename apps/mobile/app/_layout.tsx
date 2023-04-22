import { QueryClientContext, QueryClientProvider, queryClient } from '@stump/client'
import { Slot } from 'expo-router'
import React from 'react'

export default function Layout() {
	return (
		<QueryClientContext.Provider value={queryClient}>
			<QueryClientProvider client={queryClient}>
				<Slot />
			</QueryClientProvider>
		</QueryClientContext.Provider>
	)
}
