import { emailerApi, emailerQueryKeys } from '@stump/api'
import { EmailerSendRecord, SMTPEmailer } from '@stump/types'

import { queryClient, QueryOptions, useQuery } from '../client'

export function useEmailersQuery(options: QueryOptions<SMTPEmailer[]> = {}) {
	const { data: emailers, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailers],
		async () => {
			const { data } = await emailerApi.getEmailers()
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
} & QueryOptions<EmailerSendRecord[]>
export function useEmailerSendHistoryQuery({
	emailerId,
	...options
}: UseEmailerSendHistoryQueryOptions) {
	const { data: sendHistory, ...restReturn } = useQuery(
		[emailerQueryKeys.getEmailerSendHistory, emailerId],
		async () => {
			const { data } = await emailerApi.getEmailerSendHistory(emailerId)
			return data
		},
		options,
	)

	return {
		sendHistory: sendHistory ?? [],
		...restReturn,
	}
}
export const prefetchEmailerSendHistory = async (emailerId: number) =>
	queryClient.prefetchQuery([emailerQueryKeys.getEmailerSendHistory, emailerId], async () => {
		const { data } = await emailerApi.getEmailerSendHistory(emailerId)
		return data
	})
