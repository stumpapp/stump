import { authApi, authQueryKeys, checkIsClaimed, serverQueryKeys } from '@stump/api'
import type { User } from '@stump/types'
import { useEffect, useState } from 'react'

import { queryClient, QueryOptions, useMutation, useQuery } from '../client'

export function useAuthQuery(options: QueryOptions<User> = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(
		[authQueryKeys.me],
		async () => {
			const { data } = await authApi.me()
			return data
		},
		{
			useErrorBoundary: false,
			...options,
		},
	)

	return {
		error,
		isLoading: isLoading || isFetching || isRefetching,
		user: data,
	}
}

type UseLoginOrRegisterOptions = {
	onSuccess?: (data?: User | null | undefined) => void
	onError?: (data: unknown) => void
}

export function useLoginOrRegister({ onSuccess, onError }: UseLoginOrRegisterOptions) {
	const [isClaimed, setIsClaimed] = useState(true)

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(
		[serverQueryKeys.checkIsClaimed],
		checkIsClaimed,
	)

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.is_claimed) {
			setIsClaimed(false)
		}
	}, [claimCheck])

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(
		['loginUser'],
		authApi.login,
		{
			onError: (err) => {
				onError?.(err)
			},
			onSuccess: (res) => {
				if (!res.data) {
					onError?.(res)
				} else {
					queryClient.invalidateQueries(['getLibraries'])
					onSuccess?.(res.data)
				}
			},
		},
	)

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(
		[authQueryKeys.register],
		authApi.register,
	)

	return {
		isCheckingClaimed,
		isClaimed,
		isLoggingIn,
		isRegistering,
		loginUser,
		registerUser,
	}
}
