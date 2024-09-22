import { bookClubApi, bookClubQueryKeys } from '@stump/api'
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

export const prefetchBookClubChat = async (bookClubId: string, id?: string) => {
	const queryKey = id
		? [bookClubQueryKeys.getBookClubChatById, id]
		: [bookClubQueryKeys.getBookClubCurrentChat]

	const handler = () =>
		id
			? bookClubApi.getBookClubChatById(bookClubId, id)
			: bookClubApi.getBookClubCurrentChat(bookClubId)

	await queryClient.prefetchQuery(queryKey, () => handler(), {
		staleTime: 10 * 1000,
	})
}

export const prefetchThread = async (bookClubId: string, chatId: string, threadId: string) =>
	await queryClient.prefetchQuery(
		[bookClubQueryKeys.getBookClubChatThread, bookClubId, chatId, threadId],
		() => bookClubApi.getBookClubChatThread(bookClubId, chatId, threadId),
		{
			staleTime: 10 * 1000,
		},
	)

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
		[bookClubQueryKeys.createBookClub],
		(variables) => sdk.club.create(variables),
		{
			onSuccess: (bookClub, _, __) => {
				queryClient.setQueryData([bookClubQueryKeys.getBookClubById, bookClub.id], bookClub)
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
					keys: [bookClubQueryKeys.getBookClubs, bookClubQueryKeys.getBookClubChatById],
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
