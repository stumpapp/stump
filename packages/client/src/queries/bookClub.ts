import { bookClubApi, bookClubQueryKeys } from '@stump/api'
import {
	BookClub,
	BookClubChatBoard,
	CreateBookClub,
	GetBookClubsParams,
	UpdateBookClub,
} from '@stump/types'
import { AxiosError } from 'axios'

import { invalidateQueries } from '..'
import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'

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
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubs],
		() => bookClubApi.getBookClubs(params).then((res) => res.data),
		options,
	)

	return { bookClubs: data, ...rest }
}

export function useBookClubQuery(id: string, options: QueryOptions<BookClub> = {}) {
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubById, id],
		() => bookClubApi.getBookClubById(id).then((res) => res.data),
		options,
	)

	return { bookClub: data, ...rest }
}

type UseBookClubChatQueryOptions = QueryOptions<BookClubChatBoard> & {
	bookClubId: string
	chatId?: string
}
export function useChatBoardQuery({ bookClubId, chatId, ...options }: UseBookClubChatQueryOptions) {
	const queryKey = chatId
		? [bookClubQueryKeys.getBookClubChatById, chatId]
		: [bookClubQueryKeys.getBookClubCurrentChat]

	const handler = () =>
		chatId
			? bookClubApi.getBookClubChatById(bookClubId, chatId)
			: bookClubApi.getBookClubCurrentChat(bookClubId)

	const { data, ...rest } = useQuery(queryKey, () => handler().then((res) => res.data), options)
	return { chatBoard: data, ...rest }
}

export function useCreateBookClub(
	options: MutationOptions<BookClub, AxiosError, CreateBookClub> = {},
) {
	const { mutateAsync: createBookClub, ...rest } = useMutation(
		[bookClubQueryKeys.createBookClub],
		async (variables) => {
			const { data } = await bookClubApi.createBookClub(variables)
			return data
		},
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
	const { mutateAsync: updateBookClub, ...rest } = useMutation(
		[bookClubQueryKeys.updateBookClub],
		async (variables) => {
			const { data } = await bookClubApi.updateBookClub(id, variables)
			return data
		},
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
