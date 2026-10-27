import { useGraphQLMutation, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { toast } from 'sonner'

import { useTranslate } from '@/hooks/useTranslate'

import { useLlmTagReviewStore } from './useLlmTagReviewStore'

const acceptMutation = graphql(`
	mutation AcceptLlmTagSuggestions($mediaId: ID!, $tagNames: [String!]) {
		acceptLlmTagSuggestions(mediaId: $mediaId, tagNames: $tagNames)
	}
`)

const rejectMutation = graphql(`
	mutation RejectLlmTagSuggestions($mediaId: ID!) {
		rejectLlmTagSuggestions(mediaId: $mediaId)
	}
`)

const acceptAllMutation = graphql(`
	mutation AcceptAllLlmSuggestions {
		acceptAllLlmSuggestions
	}
`)

const rejectAllMutation = graphql(`
	mutation RejectAllLlmSuggestions {
		rejectAllLlmSuggestions
	}
`)

const LOCALE_KEY = 'metadataMatching.llmTagging'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`

export function useLlmTagActions() {
	const { sdk } = useSDK()
	const { t } = useTranslate()
	const queryClient = useQueryClient()
	const { records, currentRecordIndex, selectedTags, nextRecord, close } =
		useLlmTagReviewStore()

	const record = records[currentRecordIndex]

	const invalidateQueries = useCallback(() => {
		queryClient.invalidateQueries({
			predicate: ({ queryKey }) =>
				queryKey.some(
					(key) => typeof key === 'string' && key === 'pendingLlmTagSuggestions',
				) || queryKey.includes(sdk.cacheKeys.mediaById),
		})
	}, [queryClient, sdk.cacheKeys.mediaById])

	const advance = useCallback(() => {
		if (currentRecordIndex < records.length - 1) {
			nextRecord()
		} else {
			close()
		}
	}, [currentRecordIndex, records.length, nextRecord, close])

	const { mutate: accept, isPending: isAccepting } = useGraphQLMutation(
		acceptMutation,
		{
			onSuccess: () => {
				toast.success(t(getKey('toasts.accepted')))
				invalidateQueries()
				advance()
			},
			onError: () => toast.error(t(getKey('toasts.acceptFailed'))),
		},
	)

	const { mutate: reject, isPending: isRejecting } = useGraphQLMutation(
		rejectMutation,
		{
			onSuccess: () => {
				toast.success(t(getKey('toasts.rejected')))
				invalidateQueries()
				advance()
			},
			onError: () => toast.error(t(getKey('toasts.rejectFailed'))),
		},
	)

	const { mutate: acceptAll, isPending: isAcceptingAll } = useGraphQLMutation(
		acceptAllMutation,
		{
			onSuccess: ({ acceptAllLlmSuggestions: count }) => {
				toast.success(t(getKey('toasts.acceptedAll'), { count: count ?? 0 }))
				invalidateQueries()
			},
			onError: () => toast.error(t(getKey('toasts.acceptFailed'))),
		},
	)

	const { mutate: rejectAll, isPending: isRejectingAll } = useGraphQLMutation(
		rejectAllMutation,
		{
			onSuccess: ({ rejectAllLlmSuggestions: count }) => {
				toast.success(t(getKey('toasts.rejectedAll'), { count: count ?? 0 }))
				invalidateQueries()
			},
			onError: () => toast.error(t(getKey('toasts.rejectFailed'))),
		},
	)

	const acceptSelected = useCallback(() => {
		if (!record) return
		const allNames = record.suggestedTags.map((tag) => tag.name)
		const isSubset = selectedTags.size < allNames.length
		accept({
			mediaId: record.mediaId,
			// a full selection may omit the tagNames argument entirely
			tagNames: isSubset ? Array.from(selectedTags) : undefined,
		})
	}, [record, selectedTags, accept])

	const rejectCurrent = useCallback(() => {
		if (!record) return
		reject({ mediaId: record.mediaId })
	}, [record, reject])

	// Note: wrapped so the returned object does not expose react-query
	// MutateFunction types, which are not portable. The `as never` cast
	// satisfies the no-variables signature of these mutations.
	const acceptAllPending = useCallback(() => acceptAll(undefined as never), [acceptAll])
	const rejectAllPending = useCallback(() => rejectAll(undefined as never), [rejectAll])

	return {
		acceptSelected,
		rejectCurrent,
		acceptAll: acceptAllPending,
		rejectAll: rejectAllPending,
		isPending: isAccepting || isRejecting,
		isBulkPending: isAcceptingAll || isRejectingAll,
		hasSelection: selectedTags.size > 0,
		selectedCount: selectedTags.size,
	}
}
