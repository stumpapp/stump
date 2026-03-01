import type { PendingMatchRecordFragment } from '@stump/graphql'
import { MergeStrategy, MetadataField } from '@stump/graphql'

export type MatchRecord = PendingMatchRecordFragment

export type FieldComparison = {
	field: MetadataField
	label: string
	currentValue: unknown
	candidateValue: unknown
}

export function isMediaCandidate(metadata: { __typename: string }): boolean {
	return metadata.__typename === 'ExternalMediaMetadata'
}

export function getMediaFieldComparisons(
	currentMetadata: Record<string, unknown> | null | undefined,
	candidateMetadata: Record<string, unknown>,
): FieldComparison[] {
	const current = currentMetadata ?? {}
	const fields: Array<{
		field: MetadataField
		label: string
		currentKey: string
		candidateKey: string
	}> = [
		{ field: MetadataField.Title, label: 'Title', currentKey: 'title', candidateKey: 'title' },
		{
			field: MetadataField.Summary,
			label: 'Summary',
			currentKey: 'summary',
			candidateKey: 'summary',
		},
		{
			field: MetadataField.Genres,
			label: 'Genres',
			currentKey: 'genres',
			candidateKey: 'genres',
		},
		{
			field: MetadataField.Writers,
			label: 'Writers',
			currentKey: 'writers',
			candidateKey: 'writers',
		},
		{
			field: MetadataField.Colorists,
			label: 'Colorists',
			currentKey: 'colorists',
			candidateKey: 'colorists',
		},
		{
			field: MetadataField.Letterers,
			label: 'Letterers',
			currentKey: 'letterers',
			candidateKey: 'letterers',
		},
		{
			field: MetadataField.CoverArtists,
			label: 'Cover Artists',
			currentKey: 'coverArtists',
			candidateKey: 'coverArtists',
		},
		{ field: MetadataField.Year, label: 'Year', currentKey: 'year', candidateKey: 'year' },
		{
			field: MetadataField.PageCount,
			label: 'Page Count',
			currentKey: 'pageCount',
			candidateKey: 'pageCount',
		},
		{
			field: MetadataField.Isbn,
			label: 'ISBN',
			currentKey: 'identifierIsbn',
			candidateKey: 'isbn',
		},
	]

	return fields.map(({ field, label, currentKey, candidateKey }) => ({
		field,
		label,
		currentValue: current[currentKey] ?? null,
		candidateValue: candidateMetadata[candidateKey] ?? null,
	}))
}

export function getSeriesFieldComparisons(
	currentMetadata: Record<string, unknown> | null | undefined,
	candidateMetadata: Record<string, unknown>,
): FieldComparison[] {
	const current = currentMetadata ?? {}
	const fields: Array<{
		field: MetadataField
		label: string
		currentKey: string
		candidateKey: string
	}> = [
		{
			field: MetadataField.Title,
			label: 'Title',
			currentKey: 'title',
			candidateKey: 'seriesTitle',
		},
		{
			field: MetadataField.Summary,
			label: 'Summary',
			currentKey: 'summary',
			candidateKey: 'summary',
		},
		{
			field: MetadataField.Genres,
			label: 'Genres',
			currentKey: 'genres',
			candidateKey: 'genres',
		},
		{
			field: MetadataField.Authors,
			label: 'Authors',
			currentKey: 'writers',
			candidateKey: 'authors',
		},
		{
			field: MetadataField.Publisher,
			label: 'Publisher',
			currentKey: 'publisher',
			candidateKey: 'publisher',
		},
		{ field: MetadataField.Year, label: 'Year', currentKey: 'year', candidateKey: 'year' },
		{
			field: MetadataField.Status,
			label: 'Status',
			currentKey: 'status',
			candidateKey: 'status',
		},
		{
			field: MetadataField.AgeRating,
			label: 'Age Rating',
			currentKey: 'ageRating',
			candidateKey: 'ageRating',
		},
		{
			field: MetadataField.VolumeCount,
			label: 'Volume Count',
			currentKey: 'volume',
			candidateKey: 'volumeCount',
		},
	]

	return fields.map(({ field, label, currentKey, candidateKey }) => ({
		field,
		label,
		currentValue: current[currentKey] ?? null,
		candidateValue: candidateMetadata[candidateKey] ?? null,
	}))
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
): unknown {
	if (excluded) return currentValue

	const currentEmpty = isEmpty(currentValue)
	const candidateEmpty = isEmpty(candidateValue)

	switch (strategy) {
		case MergeStrategy.FillGaps:
			return currentEmpty ? candidateValue : currentValue

		case MergeStrategy.PreferExternal:
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
