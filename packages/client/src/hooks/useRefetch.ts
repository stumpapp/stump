import { useState } from 'react'

export function useRefetch<A, R>(refetch: (a?: A) => Promise<R>) {
	const [isRefetching, setIsRefetching] = useState(false)

	const handleRefetch = async () => {
		setIsRefetching(true)
		try {
			await refetch()
		} finally {
			setIsRefetching(false)
		}
	}

	return [isRefetching, handleRefetch] as const
}
