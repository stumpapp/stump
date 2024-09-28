import {
	BookClub,
	BookClubChatBoard,
	CreateBookClub,
	GetBookClubsParams,
	UpdateBookClub,
} from '@stump/types'
import { AxiosError } from 'axios'

import { useSDK } from '@/sdk'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'
import { invalidateQueries } from '../invalidate'

export const usePrefetchClubChat = ({ id }: { id: string }) => {
	const { sdk } = useSDK()

	const prefetch = async (chatID?: string) => {
		const queryKey = chatID
			? [sdk.club.keys.getDiscussionById, chatID]
			: [sdk.club.keys.getCurrentDiscussion]

		queryClient.prefetchQuery(
			queryKey,
			() => {
				if (chatID) {
					return sdk.club.getDiscussionById(id, chatID)
				} else {
					return sdk.club.getCurrentDiscussion(id)
				}
			},
			{
				staleTime: 10 * 1000,
			},
		)
	}

	return { prefetch }
}

type UsePrefetchClubThreadParams = {
	bookClubId: string
	chatId: string
	threadId: string
}
export const usePrefetchClubThread = () => {
	const { sdk } = useSDK()

	const prefetch = async ({ bookClubId, chatId, threadId }: UsePrefetchClubThreadParams) =>
		queryClient.prefetchQuery(
			[sdk.club.keys.getDiscussionThread, bookClubId, chatId, threadId],
			() => sdk.club.getDiscussionThread(bookClubId, chatId, threadId),
			{
				staleTime: 10 * 1000,
			},
		)

	return { prefetch }
}

type UseBookClubsQueryOptions = QueryOptions<BookClub[]> & {
	params?: GetBookClubsParams
}

export function useBookClubsQuery({ params, ...options }: UseBookClubsQueryOptions = {}) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.club.keys.get],
		async () => {
			const data = await sdk.club.get(params)
			return data
		},
		options,
	)

	return { bookClubs: data, ...rest }
}

export function useBookClubQuery(id: string, options: QueryOptions<BookClub> = {}) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.club.getByID, id],
		async () => {
			const data = await sdk.club.getByID(id)
			return data
		},
		options,
	)

	return { bookClub: data, ...rest }
}

type UseBookClubChatQueryOptions = QueryOptions<BookClubChatBoard> & {
	bookClubId: string
	chatId?: string
}
export function useChatBoardQuery({ bookClubId, chatId, ...options }: UseBookClubChatQueryOptions) {
	const { sdk } = useSDK()

	const queryKey = chatId
		? [sdk.club.keys.getDiscussionById, chatId]
		: [sdk.club.keys.getCurrentDiscussion]

	const { data, ...rest } = useQuery(
		queryKey,
		async () => {
			if (chatId) {
				return sdk.club.getDiscussionById(bookClubId, chatId)
			} else {
				return sdk.club.getCurrentDiscussion(bookClubId)
			}
		},
		options,
	)
	return { chatBoard: data, ...rest }
}

export function useCreateBookClub(
	options: MutationOptions<BookClub, AxiosError, CreateBookClub> = {},
) {
	const { sdk } = useSDK()
	const { mutateAsync: createBookClub, ...rest } = useMutation(
		[sdk.club.keys.create],
		(variables) => sdk.club.create(variables),
		{
			onSuccess: (bookClub, _, __) => {
				queryClient.setQueryData([sdk.club.keys.getByID, bookClub.id], bookClub)
				options.onSuccess?.(bookClub, _, __)
				return bookClub
			},
			...options,
		},
	)

	return {
		createBookClub,
		...rest,
	}
}

type UseBookClubChatMutationOptions = {
	id: string
} & MutationOptions<BookClub, AxiosError, UpdateBookClub>
export function useUpdateBookClub({ id, ...options }: UseBookClubChatMutationOptions) {
	const { sdk } = useSDK()
	const { mutateAsync: updateBookClub, ...rest } = useMutation(
		[sdk.club.keys.update, id],
		async (variables) => sdk.club.update(id, variables),
		{
			onSuccess: (bookClub, _, __) => {
				invalidateQueries({
					keys: [sdk.club.keys.get, sdk.club.keys.getDiscussionById],
				})
				options.onSuccess?.(bookClub, _, __)
				return bookClub
			},
			...options,
		},
	)

	return {
		updateBookClub,
		...rest,
	}
}
