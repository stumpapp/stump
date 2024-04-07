import { emailerApi, emailerQueryKeys } from '@stump/api'
import {
	CreateOrUpdateEmailDevice,
	EmailerIncludeParams,
	EmailerSendRecord,
	EmailerSendRecordIncludeParams,
	RegisteredEmailDevice,
	SMTPEmailer,
} from '@stump/types'
import { AxiosError } from 'axios'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'

type UseEmailersQueryOptions = {
	params?: EmailerIncludeParams
} & QueryOptions<SMTPEmailer[]>
export function useEmailersQuery({ params, ...options }: UseEmailersQueryOptions = {}) {
	const { data: emailers, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailers, params],
		async () => {
			const { data } = await emailerApi.getEmailers(params)
			return data
		},
		options,
	)

	return {
		emailers,
		...restReturn,
	}
}

type UseEmailerSendHistoryQueryOptions = {
	emailerId: number
	params?: EmailerSendRecordIncludeParams
} & QueryOptions<EmailerSendRecord[]>
export function useEmailerSendHistoryQuery({
	emailerId,
	params,
	...options
}: UseEmailerSendHistoryQueryOptions) {
	const { data: sendHistory, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailerSendHistory, emailerId, params],
		async () => {
			const { data } = await emailerApi.getEmailerSendHistory(emailerId, params)
			return data
		},
		options,
	)

	return {
		sendHistory: sendHistory ?? [],
		...restReturn,
	}
}
export const prefetchEmailerSendHistory = async (
	emailerId: number,
	params?: EmailerSendRecordIncludeParams,
) =>
	queryClient.prefetchQuery(
		[emailerQueryKeys.getEmailerSendHistory, emailerId, params],
		async () => {
			const { data } = await emailerApi.getEmailerSendHistory(emailerId)
			return data
		},
	)

type UseEmailDevicesQueryOptions = QueryOptions<RegisteredEmailDevice[]>
export function useEmailDevicesQuery(options: UseEmailDevicesQueryOptions = {}) {
	const { data, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailDevices],
		async () => {
			const { data } = await emailerApi.getEmailDevices()
			return data
		},
		{
			suspense: true,
			...options,
		},
	)
	const devices = data || []

	return {
		devices,
		...restReturn,
	}
}

export function useCreateEmailDevice() {
	const {
		mutate: create,
		mutateAsync: createAsync,
		...restReturn
	} = useMutation([emailerQueryKeys.createEmailDevice], emailerApi.createEmailDevice)

	return {
		create,
		createAsync,
		...restReturn,
	}
}

type UseUpdateEmailDeviceOptions = { id: number } & MutationOptions<
	RegisteredEmailDevice,
	AxiosError,
	CreateOrUpdateEmailDevice
>
export function useUpdateEmailDevice({ id, ...options }: UseUpdateEmailDeviceOptions) {
	const {
		mutate: update,
		mutateAsync: updateAsync,
		...restReturn
	} = useMutation(
		[emailerQueryKeys.updateEmailDevice],
		(payload: CreateOrUpdateEmailDevice) => {
			return emailerApi.updateEmailDevice(id, payload).then((res) => res.data)
		},
		options,
	)

	return {
		update,
		updateAsync,
		...restReturn,
	}
}
