import { isUser, LoginOrRegisterArgs, type User } from '@stump/types'
import { useEffect, useState } from 'react'

import { useSDK } from '@/sdk'

import { queryClient, QueryOptions, useMutation, useQuery } from '../client'

export function useAuthQuery(options: QueryOptions<User> = {}) {
	const { sdk } = useSDK()
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(
		[sdk.auth.keys.me],
		async () => {
			const data = await sdk.auth.me()
			if (!isUser(data)) {
				console.debug('Malformed response recieved from server', data)
				throw new Error('Malformed response recieved from server')
			}
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
	refetchClaimed?: boolean
}

export function useLoginOrRegister({
	onSuccess,
	onError,
	refetchClaimed,
}: UseLoginOrRegisterOptions) {
	const [isClaimed, setIsClaimed] = useState(true)

	const { sdk } = useSDK()
	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(
		[sdk.server.keys.claimedStatus, refetchClaimed],
		() => sdk.server.claimedStatus(),
	)

	useEffect(() => {
		if (claimCheck?.data) {
			setIsClaimed(claimCheck.data.is_claimed)
		}
	}, [claimCheck])

	const {
		isLoading: isLoggingIn,
		mutateAsync: loginUser,
		error: loginError,
	} = useMutation([sdk.auth.keys.login], (params: LoginOrRegisterArgs) => sdk.auth.login(params), {
		onError: (err) => {
			onError?.(err)
		},
		onSuccess: (user) => {
			queryClient.invalidateQueries(['getLibraries'])
			onSuccess?.(user)
		},
	})

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(
		[sdk.auth.register],
		(params: LoginOrRegisterArgs) => sdk.auth.register(params),
		{
			onSuccess: async () => {
				await queryClient.invalidateQueries([sdk.server.keys.claimedStatus])
			},
		},
	)

	return {
		isCheckingClaimed,
		isClaimed,
		isLoggingIn,
		isRegistering,
		loginError,
		loginUser,
		registerUser,
	}
}

type UseLogoutParams = {
	removeStoreUser?: () => void
}

export function useLogout({ removeStoreUser }: UseLogoutParams = {}) {
	const { sdk } = useSDK()
	const { mutateAsync: logout, isLoading } = useMutation([sdk.auth.keys.logout], sdk.auth.logout, {
		onSuccess: () => {
			queryClient.clear()
			removeStoreUser?.()
		},
	})

	return { isLoggingOut: isLoading, logout }
}
