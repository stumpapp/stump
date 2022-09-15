import { useEffect, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { checkIsClaimed } from '../api';
import { login, me, register } from '../api/auth';
import { queryClient } from '../client';
import { ClientQueryParams } from '.';

import type { User } from '@stump/core';
export interface AuthQueryOptions {
	disabled?: boolean;
	onSuccess?: (user: User | null) => void;
	enabled?: boolean;
}

export function useAuthQuery(options: AuthQueryOptions = {}) {
	const { data, error, isLoading, isFetching, isRefetching } = useQuery(['getViewer'], me, {
		onSuccess(res) {
			options.onSuccess?.(res.data);
		},
		useErrorBoundary: false,
		enabled: options?.enabled,
	});

	return {
		user: data,
		error,
		isLoading: isLoading || isFetching || isRefetching,
	};
}

export function useLoginOrRegister({ onSuccess, onError }: ClientQueryParams<User>) {
	const [isClaimed, setIsClaimed] = useState(true);

	const { data: claimCheck, isLoading: isCheckingClaimed } = useQuery(['checkIsClaimed'], {
		queryFn: checkIsClaimed,
	});

	useEffect(() => {
		if (claimCheck?.data && !claimCheck.data.isClaimed) {
			setIsClaimed(false);
		}
	}, [claimCheck]);

	const { isLoading: isLoggingIn, mutateAsync: loginUser } = useMutation(['loginUser'], {
		mutationFn: login,
		onSuccess: (res) => {
			if (!res.data) {
				onError?.(res);
			} else {
				queryClient.invalidateQueries(['getLibraries']);

				onSuccess?.(res.data);
			}
		},
		onError: (err) => {
			onError?.(err);
		},
	});

	const { isLoading: isRegistering, mutateAsync: registerUser } = useMutation(['registerUser'], {
		mutationFn: register,
		// onError(err) {
		// 	onError?.(err);
		// },
	});

	return {
		isClaimed,
		isCheckingClaimed,
		isLoggingIn,
		isRegistering,
		loginUser,
		registerUser,
	};
}
