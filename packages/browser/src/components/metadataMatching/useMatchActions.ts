import { useGraphQLMutation } from '@stump/client'
import { graphql, MetadataField } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useMatchReviewStore } from './useMatchReviewStore'

const acceptMediaMatchMutation = graphql(`
	mutation AcceptMediaMatch(
		$mediaId: ID!
		$candidateIndex: Int!
		$strategy: MergeStrategy
		$excludeFields: [MetadataField!]
		$overrides: [MetadataFieldOverrideInput!]
	) {
		acceptMediaMatch(
			mediaId: $mediaId
			candidateIndex: $candidateIndex
			strategy: $strategy
			excludeFields: $excludeFields
			overrides: $overrides
		) {
			...PendingMatchRecord
		}
	}
`)

const acceptSeriesMatchMutation = graphql(`
	mutation AcceptSeriesMatch(
		$seriesId: ID!
		$candidateIndex: Int!
		$strategy: MergeStrategy
		$excludeFields: [MetadataField!]
		$overrides: [MetadataFieldOverrideInput!]
	) {
		acceptSeriesMatch(
			seriesId: $seriesId
			candidateIndex: $candidateIndex
			strategy: $strategy
			excludeFields: $excludeFields
			overrides: $overrides
		) {
			...PendingMatchRecord
		}
	}
`)

const rejectMediaMatchMutation = graphql(`
	mutation RejectMediaMatch($mediaId: ID!, $candidateIndex: Int!) {
		rejectMediaMatch(mediaId: $mediaId, candidateIndex: $candidateIndex) {
			...PendingMatchRecord
		}
	}
`)

const rejectSeriesMatchMutation = graphql(`
	mutation RejectSeriesMatch($seriesId: ID!, $candidateIndex: Int!) {
		rejectSeriesMatch(seriesId: $seriesId, candidateIndex: $candidateIndex) {
			...PendingMatchRecord
		}
	}
`)

export function useMatchActions() {
	const {
		records,
		currentRecordIndex,
		currentCandidateIndex,
		excludedFields,
		strategy,
		fieldOverrides,
		nextRecord,
		close,
	} = useMatchReviewStore()

	const record = records[currentRecordIndex]
	const isMedia = !!record?.mediaId
	const entityId = (isMedia ? record?.mediaId : record?.seriesId) ?? ''
	const hasCandidate = (record?.matchCandidates?.length ?? 0) > currentCandidateIndex

	const client = useQueryClient()

	const invalidateQueries = () => {
		client.invalidateQueries({
			predicate: ({ queryKey }) =>
				queryKey.some((key) => typeof key === 'string' && key === 'pendingMetadataMatches'),
		})
	}

	const advance = () => {
		if (currentRecordIndex < records.length - 1) {
			nextRecord()
		} else {
			close()
		}
	}
	const onSuccess = (msg: string) => {
		toast.success(msg)
		invalidateQueries()
		advance()
	}

	const { mutate: acceptMedia, isPending: isAcceptingMedia } = useGraphQLMutation(
		acceptMediaMatchMutation,
		{
			onSuccess: () => onSuccess('Match accepted'),
			onError: () => toast.error('Failed to accept match'),
		},
	)

	const { mutate: acceptSeries, isPending: isAcceptingSeries } = useGraphQLMutation(
		acceptSeriesMatchMutation,
		{
			onSuccess: () => onSuccess('Match accepted'),
			onError: () => toast.error('Failed to accept match'),
		},
	)

	const { mutate: rejectMedia, isPending: isRejectingMedia } = useGraphQLMutation(
		rejectMediaMatchMutation,
		{
			onSuccess: () => onSuccess('Match rejected'),
			onError: () => toast.error('Failed to reject match'),
		},
	)

	const { mutate: rejectSeries, isPending: isRejectingSeries } = useGraphQLMutation(
		rejectSeriesMatchMutation,
		{
			onSuccess: () => onSuccess('Match rejected'),
			onError: () => toast.error('Failed to reject match'),
		},
	)

	const isPending = isAcceptingMedia || isAcceptingSeries || isRejectingMedia || isRejectingSeries

	const accept = () => {
		if (!record || !hasCandidate) return
		const excludeFieldsList = Array.from(excludedFields)
		const exclude = excludeFieldsList.length > 0 ? excludeFieldsList : undefined

		const overrideEntries = Array.from(fieldOverrides.entries()).map(([field, value]) => ({
			field,
			value,
		}))
		const overrides = overrideEntries.length > 0 ? overrideEntries : undefined

		if (isMedia) {
			acceptMedia({
				mediaId: entityId,
				candidateIndex: currentCandidateIndex,
				strategy,
				excludeFields: exclude,
				overrides,
			})
		} else {
			acceptSeries({
				seriesId: entityId,
				candidateIndex: currentCandidateIndex,
				strategy,
				excludeFields: exclude,
				overrides,
			})
		}
	}

	const reject = () => {
		if (!record || !hasCandidate) return
		if (isMedia) {
			rejectMedia({ mediaId: entityId, candidateIndex: currentCandidateIndex })
		} else {
			rejectSeries({ seriesId: entityId, candidateIndex: currentCandidateIndex })
		}
	}

	return { accept, reject, skip: advance, isPending, hasCandidate }
}
