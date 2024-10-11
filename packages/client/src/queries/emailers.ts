import {
	CreateOrUpdateEmailDevice,
	CreateOrUpdateEmailer,
	EmailerIncludeParams,
	EmailerSendRecord,
	EmailerSendRecordIncludeParams,
	RegisteredEmailDevice,
	SendAttachmentEmailsPayload,
	SMTPEmailer,
} from '@stump/sdk'
import { AxiosError } from 'axios'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'
import { useSDK } from '../sdk'

type UseEmailersQueryOptions = {
	params?: EmailerIncludeParams
} & QueryOptions<SMTPEmailer[]>
export function useEmailersQuery({ params, ...options }: UseEmailersQueryOptions = {}) {
	const { sdk } = useSDK()
	const { data: emailers, ...restReturn } = useQuery(
		[sdk.emailer.keys.get, params],
		async () => sdk.emailer.get(params),
		options,
	)

	return {
		emailers,
		...restReturn,
	}
}

type UseEmailerQueryOptions = { id: number } & QueryOptions<SMTPEmailer>
export function useEmailerQuery({ id, ...options }: UseEmailerQueryOptions) {
	const { sdk } = useSDK()
	const { data: emailer, ...restReturn } = useQuery(
		[sdk.emailer.keys.getByID, id],
		async () => sdk.emailer.getByID(id),
		options,
	)

	return {
		emailer,
		...restReturn,
	}
}

type UseCreateEmailerOptions = { id: number } & MutationOptions<
	SMTPEmailer,
	AxiosError,
	CreateOrUpdateEmailer
>
export function useUpdateEmailer({ id, ...options }: UseCreateEmailerOptions) {
	const { sdk } = useSDK()
	const {
		mutate: update,
		mutateAsync: updateAsync,
		...restReturn
	} = useMutation([sdk.emailer.keys.update], (params) => sdk.emailer.update(id, params), {
		...options,
		onSuccess: () =>
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.some(
						(key) => typeof key === 'string' && key.includes(sdk.emailer.keys.get),
					),
			}),
	})

	return {
		update,
		updateAsync,
		...restReturn,
	}
}

export function useDeleteEmailer() {
	const { sdk } = useSDK()
	const {
		mutate: deleteEmailer,
		mutateAsync: deleteEmailerAsync,
		...restReturn
	} = useMutation([sdk.emailer.keys.delete], (id: number) => sdk.emailer.delete(id), {
		onSuccess: () =>
			queryClient.invalidateQueries({
				predicate: (query) =>
					query.queryKey.some(
						(key) => typeof key === 'string' && key.includes(sdk.emailer.keys.get),
					),
			}),
	})

	return {
		deleteEmailer,
		deleteEmailerAsync,
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
	const { sdk } = useSDK()
	const { data: sendHistory, ...restReturn } = useQuery(
		[sdk.emailer.keys.getSendHistory, emailerId, params],
		async () => sdk.emailer.getSendHistory(emailerId, params),
		options,
	)

	return {
		sendHistory: sendHistory ?? [],
		...restReturn,
	}
}
export const usePrefetchEmailerSendHistory = ({ emailerId }: { emailerId: number }) => {
	const { sdk } = useSDK()
	const prefetch = (params?: EmailerSendRecordIncludeParams) =>
		queryClient.prefetchQuery([sdk.emailer.keys.getSendHistory, emailerId, params], async () =>
			sdk.emailer.getSendHistory(emailerId, params),
		)

	return { prefetch }
}

type UseEmailDevicesQueryOptions = QueryOptions<RegisteredEmailDevice[]>
export function useEmailDevicesQuery(options: UseEmailDevicesQueryOptions = {}) {
	const { sdk } = useSDK()
	const { data, ...restReturn } = useQuery(
		[sdk.emailer.keys.getDevices],
		async () => sdk.emailer.getDevices(),
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

export function useSendAttachmentEmail() {
	const { sdk } = useSDK()
	const {
		mutate: send,
		mutateAsync: sendAsync,
		isLoading: isSending,
		...restReturn
	} = useMutation([sdk.emailer.keys.send], (payload: SendAttachmentEmailsPayload) =>
		sdk.emailer.send(payload),
	)

	return {
		isSending,
		send,
		sendAsync,
		...restReturn,
	}
}

export function useCreateEmailDevice() {
	const { sdk } = useSDK()
	const {
		mutate: create,
		mutateAsync: createAsync,
		...restReturn
	} = useMutation([sdk.emailer.keys.createDevice], (payload: CreateOrUpdateEmailDevice) =>
		sdk.emailer.createDevice(payload),
	)

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
	const { sdk } = useSDK()
	const {
		mutate: update,
		mutateAsync: updateAsync,
		...restReturn
	} = useMutation(
		[sdk.emailer.keys.update],
		(payload: CreateOrUpdateEmailDevice) => sdk.emailer.updateDevice(id, payload),
		options,
	)

	return {
		update,
		updateAsync,
		...restReturn,
	}
}

export function useDeleteEmailDevice() {
	const { sdk } = useSDK()
	const {
		mutate: remove,
		mutateAsync: removeAsync,
		isLoading: isDeleting,
		...restReturn
	} = useMutation([sdk.emailer.keys.deleteDevice], (id: number) => sdk.emailer.deleteDevice(id))

	return {
		isDeleting,
		remove,
		removeAsync,
		...restReturn,
	}
}
