import type { PendingMatchRecordFragment } from '@stump/graphql'
import { MergeStrategy } from '@stump/graphql'

export type { FieldComparison } from '../fieldDefs'
export { getMediaFieldComparisons, getSeriesFieldComparisons } from '../fieldDefs'

export type MatchRecord = PendingMatchRecordFragment

/**
 * A per-field strategy override that tells the resolver to use a specific
 * strategy rather than the global one
 */
export type PerFieldStrategy = 'keepCurrent' | 'takeExternal' | 'merge'

export type FieldOverride =
	| { type: 'strategy'; strategy: PerFieldStrategy }
	| { type: 'custom'; value: unknown }

export function isMediaCandidate(metadata: { __typename: string }): boolean {
	return metadata.__typename === 'ExternalMediaMetadata'
}

function isEmpty(value: unknown): boolean {
	if (value == null || value === '') return true
	if (Array.isArray(value) && value.length === 0) return true
	return false
}

function mergeArrays(a: unknown[], b: unknown[]): unknown[] {
	const set = new Set([...a.map(String), ...b.map(String)])
	return Array.from(set)
}

export function resolveFieldValue(
	currentValue: unknown,
	candidateValue: unknown,
	strategy: MergeStrategy,
	excluded: boolean,
	override?: FieldOverride,
): unknown {
	// Excluded fields always keep the current value, regardless of overrides
	if (excluded) return currentValue

	if (override !== undefined) {
		if (override.type === 'custom') {
			return override.value
		}
		if (override.type === 'strategy') {
			switch (override.strategy) {
				case 'keepCurrent':
					return currentValue
				case 'takeExternal':
					return candidateValue
				case 'merge':
					if (Array.isArray(currentValue) && Array.isArray(candidateValue)) {
						return mergeArrays(currentValue, candidateValue)
					}
					// For non-array fields, "merge" acts as take-external
					return candidateValue
			}
		}
	}

	const currentEmpty = isEmpty(currentValue)
	const candidateEmpty = isEmpty(candidateValue)

	switch (strategy) {
		case MergeStrategy.FillGaps:
			return currentEmpty ? candidateValue : currentValue

		case MergeStrategy.PreferExternal:
			return candidateEmpty ? currentValue : candidateValue

		case MergeStrategy.PreferExternalAndMergeLists:
			if (Array.isArray(currentValue) && Array.isArray(candidateValue)) {
				return mergeArrays(currentValue, candidateValue)
			}
			return candidateEmpty ? currentValue : candidateValue

		case MergeStrategy.FillAndMergeLists:
			if (Array.isArray(currentValue) && Array.isArray(candidateValue)) {
				return mergeArrays(currentValue, candidateValue)
			}
			// For scalars, same as FillGaps
			return currentEmpty ? candidateValue : currentValue

		default:
			return currentValue
	}
}
