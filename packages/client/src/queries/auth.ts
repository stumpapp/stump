import { useEffect, useState } from 'react'

import { checkIsClaimed } from '../api'
import { login, me, register } from '../api/auth'
import { queryClient, useMutation, useQuery } from '../client'
import type { User } from '../types'
import { ClientQueryParams, QueryCallbacks } from '.'

export interface AuthQueryOptions extends QueryCallbacks<User> {
	disabled?: boolean
	enabled?: boolean
}

export function useAuthQuery(options: AuthQueryOptions = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(['getViewer'], me, {
		enabled: options?.enabled,
		onError(err) {
			options.onError?.(err)
		},
		onSuccess(res) {
			options.onSuccess?.(res.data)
		},
		useErrorBoundary: false,
	})

	return {
		error,
		isLoading: isLoading || isFetching || isRefetching,
		user: data,
	}
}

export function useLoginOrRegister({ onSuccess, onError }: ClientQueryParams<User>) {
	const [isClaimed, setIsClaimed] = useState(true)

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(
		['checkIsClaimed'],
		checkIsClaimed,
	)

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.is_claimed) {
			setIsClaimed(false)
		}
	}, [claimCheck])

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(['loginUser'], login, {
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
	})

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(
		['registerUser'],
		register,
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
