import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'

import {
	getMediaFieldComparisons,
	getSeriesFieldComparisons,
	isMediaCandidate,
	resolveFieldValue,
} from './types'
import { useMatchReviewStore } from './useMatchReviewStore'

const acceptMediaMatchMutation = graphql(`
	mutation AcceptMediaMatch(
		$mediaId: ID!
		$candidateIndex: Int!
		$strategy: MergeStrategy
		$excludeFields: [MetadataField!]
		$overrides: [MetadataFieldOverride!]
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
		$overrides: [MetadataFieldOverride!]
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
	const candidate = record?.matchCandidates?.[currentCandidateIndex]
	const hasCandidate = !!candidate
	const currentMetadata = isMedia ? record?.media?.metadata : record?.series?.metadata

	const fieldComparisons = useMemo(() => {
		if (!candidate) return []
		const meta = candidate.metadata as Record<string, unknown>
		if (isMedia && isMediaCandidate(candidate.metadata)) {
			return getMediaFieldComparisons(currentMetadata, meta)
		} else if (!isMedia && !isMediaCandidate(candidate.metadata)) {
			return getSeriesFieldComparisons(currentMetadata, meta)
		}
		return []
	}, [candidate, currentMetadata, isMedia])

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

		const overrideEntries = Array.from(fieldOverrides.entries())
			.map(([field, override]) => {
				if (override.type === 'custom') {
					return { field, value: override.value }
				}
				const comparison = fieldComparisons.find((c) => c.field === field)
				if (!comparison) return null
				const resolved = resolveFieldValue(
					comparison.currentValue,
					comparison.candidateValue,
					strategy,
					false, // strategy overrides bypass exclusion
					override,
				)
				return { field, value: resolved }
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry != null)
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

	return { accept, reject, isPending, hasCandidate }
}
