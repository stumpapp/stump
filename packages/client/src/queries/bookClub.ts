import { bookClubApi, bookClubQueryKeys } from '@stump/api'
import {
	BookClub,
	BookClubDiscussion,
	BookClubMember,
	CreateBookClub,
	GetBookClubsParams,
	UpdateBookClub,
} from '@stump/types'
import { AxiosError } from 'axios'

import { MutationOptions, queryClient, QueryOptions, useMutation, useQuery } from '../client'
import { invalidateQueries } from '../invalidate'

export const prefetchBookClubDiscussion = async (bookClubId: string, id?: string) => {
	const queryKey = id
		? [bookClubQueryKeys.getBookClubDiscussionById, id]
		: [bookClubQueryKeys.getBookClubCurrentDiscussion]

	const handler = () =>
		id
			? bookClubApi.getBookClubDiscussionById(bookClubId, id)
			: bookClubApi.getBookClubCurrentDiscussion(bookClubId)

	await queryClient.prefetchQuery(queryKey, () => handler(), {
		staleTime: 10 * 1000,
	})
}

export const prefetchThread = async (bookClubId: string, chatId: string, threadId: string) =>
	await queryClient.prefetchQuery(
		[bookClubQueryKeys.getBookClubDiscussionThread, bookClubId, chatId, threadId],
		() => bookClubApi.getBookClubDiscussionThread(bookClubId, chatId, threadId),
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

export function useBookClubMembersQuery({
	id,
	...options
}: { id: string } & QueryOptions<BookClubMember[]>) {
	const { data, ...rest } = useQuery(
		[bookClubQueryKeys.getBookClubMembers, id],
		() => bookClubApi.getBookClubMembers(id).then((res) => res.data),
		options,
	)

	return { members: data, ...rest }
}

type UseBookClubDiscussionQueryOptions = QueryOptions<BookClubDiscussion> & {
	bookClubId: string
	discussionId?: string
}
export function useDiscussionQuery({
	bookClubId,
	discussionId,
	...options
}: UseBookClubDiscussionQueryOptions) {
	const queryKey = discussionId
		? [bookClubQueryKeys.getBookClubDiscussionById, discussionId]
		: [bookClubQueryKeys.getBookClubCurrentDiscussion]

	const handler = () =>
		discussionId
			? bookClubApi.getBookClubDiscussionById(bookClubId, discussionId)
			: bookClubApi.getBookClubCurrentDiscussion(bookClubId)

	const { data, ...rest } = useQuery(queryKey, () => handler().then((res) => res.data), options)
	return { discussion: data, ...rest }
}

export function useCreateBookClub(
	options: MutationOptions<BookClub, AxiosError, CreateBookClub> = {},
) {
	const { mutateAsync, mutate, ...rest } = useMutation(
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
		create: mutate,
		createAsync: mutateAsync,
		...rest,
	}
}

type UseBookClubDiscussionMutationOptions = {
	id: string
} & MutationOptions<BookClub, AxiosError, UpdateBookClub>
export function useUpdateBookClub({ id, ...options }: UseBookClubDiscussionMutationOptions) {
	const { mutateAsync: updateBookClub, ...rest } = useMutation(
		[bookClubQueryKeys.updateBookClub],
		async (variables) => {
			const { data } = await bookClubApi.updateBookClub(id, variables)
			return data
		},
		{
			onSuccess: (bookClub, _, __) => {
				invalidateQueries({
					keys: [bookClubQueryKeys.getBookClubs, bookClubQueryKeys.getBookClubDiscussionById],
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

export function useDeleteBookClub({ id, ...options }: { id: string } & MutationOptions<void>) {
	const { mutate, mutateAsync, ...rest } = useMutation(
		[bookClubQueryKeys.deleteBookClub, id],
		async () => {
			await bookClubApi.deleteBookClub(id)
		},
		{
			onSuccess: (_, __, ___) => {
				invalidateQueries({
					keys: [bookClubQueryKeys.getBookClubs, bookClubQueryKeys.getBookClubById],
				})
				options.onSuccess?.(_, __, ___)
			},
			...options,
		},
	)

	return {
		deleteClub: mutate,
		deleteClubAsync: mutateAsync,
		...rest,
	}
}
