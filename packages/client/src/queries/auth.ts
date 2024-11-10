import { isAxiosError, isUser, LoginOrRegisterArgs, type User } from '@stump/sdk'
import { useEffect, useState } from 'react'

import { useClientContext } from '@/context'

import { queryClient, QueryOptions, useMutation, useQuery } from '../client'
import { useSDK } from '../sdk'

export function useAuthQuery(options: QueryOptions<User> = {}) {
	const { sdk } = useSDK()
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(
		[sdk.auth.keys.me],
		async () => {
			const data = await sdk.auth.me()
			if (!isUser(data)) {
				console.warn('Malformed response recieved from server', data)
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

	const { onAuthenticated } = useClientContext()
	const { sdk } = useSDK()
	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(
		[sdk.server.keys.claimedStatus, refetchClaimed],
		() => sdk.server.claimedStatus(),
		{
			retry: (failureCount, error) => {
				if (failureCount > 3) {
					return false
				} else {
					return isAxiosError(error) && error.code === 'ERR_NETWORK'
				}
			},
		},
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
		onSuccess: async (response) => {
			// TODO(token): refresh support
			if ('for_user' in response && !!onAuthenticated) {
				const {
					for_user,
					token: { access_token },
				} = response
				await onAuthenticated(for_user, access_token)
				onSuccess?.(for_user)
			} else if (isUser(response)) {
				onSuccess?.(response)
			}

			await queryClient.invalidateQueries(['getLibraries'])
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
	const { onLogout } = useClientContext()
	const { mutateAsync: logout, isLoading } = useMutation(
		[sdk.auth.keys.logout],
		() => sdk.auth.logout(),
		{
			onSuccess: async () => {
				queryClient.clear()
				removeStoreUser?.()
				await onLogout?.()
			},
		},
	)

	return { isLoggingOut: isLoading, logout }
}
