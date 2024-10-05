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
import { useSDK } from '../sdk'

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

type UsePrefetchDiscussionThreadParams = {
	bookClubId: string
	chatId: string
	threadId: string
}
export const usePrefetchClubThread = () => {
	const { sdk } = useSDK()

	const prefetch = async ({ bookClubId, chatId, threadId }: UsePrefetchDiscussionThreadParams) =>
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
	const { data, ...rest } = useQuery([sdk.club.keys.get], async () => sdk.club.get(params), options)

	return { bookClubs: data, ...rest }
}

export function useBookClubQuery(id: string, options: QueryOptions<BookClub> = {}) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.club.getByID, id],
		async () => sdk.club.getByID(id),
		options,
	)

	return { bookClub: data, ...rest }
}

export function useBookClubMembersQuery({
	id,
	...options
}: { id: string } & QueryOptions<BookClubMember[]>) {
	const { sdk } = useSDK()
	const { data, ...rest } = useQuery(
		[sdk.club.keys.getMembers, id],
		() => sdk.club.getMembers(id),
		options,
	)

	return { members: data, ...rest }
}

type UseBookClubDiscussionQueryOptions = QueryOptions<BookClubDiscussion> & {
	bookClubId: string
	chatId?: string
	discussionId?: string
}

export function useDiscussionQuery({
	bookClubId,
	chatId,
	...options
}: UseBookClubDiscussionQueryOptions) {
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
	return { discussion: data, ...rest }
}

export function useCreateBookClub(
	options: MutationOptions<BookClub, AxiosError, CreateBookClub> = {},
) {
	const { sdk } = useSDK()
	const { mutateAsync, mutate, ...rest } = useMutation(
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
		create: mutate,
		createAsync: mutateAsync,
		...rest,
	}
}

type UseBookClubDiscussionMutationOptions = {
	id: string
} & MutationOptions<BookClub, AxiosError, UpdateBookClub>

export function useUpdateBookClub({ id, ...options }: UseBookClubDiscussionMutationOptions) {
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

export function useDeleteBookClub({ id, ...options }: { id: string } & MutationOptions<void>) {
	const { sdk } = useSDK()
	const { mutate, mutateAsync, ...rest } = useMutation(
		[sdk.club.keys.delete, id],
		async () => {
			await sdk.club.delete(id)
		},
		{
			onSuccess: (_, __, ___) => {
				invalidateQueries({
					keys: [sdk.club.keys.get, sdk.club.keys.getByID],
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
