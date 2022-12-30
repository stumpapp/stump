import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { checkIsClaimed } from '../api';
import { login, me, register } from '../api/auth';
import { queryClient } from '../client';
import { StumpQueryContext } from '../context';
import type { User } from '../types';
import { ClientQueryParams, QueryCallbacks } from '.';
export interface AuthQueryOptions extends QueryCallbacks<User> {
	disabled?: boolean;
	// onSuccess?: (user: User | null) => void;
	enabled?: boolean;
}

export function useAuthQuery(options: AuthQueryOptions = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(['getViewer'], me, {
		context: StumpQueryContext,
		enabled: options?.enabled,
		onError(err) {
			options.onError?.(err);
		},
		onSuccess(res) {
			options.onSuccess?.(res.data);
		},
		useErrorBoundary: false,
	});

	return {
		error,
		isLoading: isLoading || isFetching || isRefetching,
		user: data,
	};
}

export function useLoginOrRegister({ onSuccess, onError }: ClientQueryParams<User>) {
	const [isClaimed, setIsClaimed] = useState(true);

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(['checkIsClaimed'], {
		context: StumpQueryContext,
		queryFn: checkIsClaimed,
	});

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.is_claimed) {
			setIsClaimed(false);
		}
	}, [claimCheck]);

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(['loginUser'], {
		context: StumpQueryContext,
		mutationFn: login,
		onError: (err) => {
			onError?.(err);
		},
		onSuccess: (res) => {
			if (!res.data) {
				onError?.(res);
			} else {
				queryClient.invalidateQueries(['getLibraries']);

				onSuccess?.(res.data);
			}
		},
	});

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(['registerUser'], {
		// onError(err) {
		// 	onError?.(err);
		// },
		context: StumpQueryContext,

		mutationFn: register,
	});

	return {
		isCheckingClaimed,
		isClaimed,
		isLoggingIn,
		isRegistering,
		loginUser,
		registerUser,
	};
}
