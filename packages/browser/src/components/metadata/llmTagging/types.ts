import type { LlmTagSuggestionFragment } from '@stump/graphql'

export type LlmSuggestedTag = {
	name: string
	confidence: number
	reason?: string | null
}

export type LlmTagSuggestionMedia = {
	id: string
	resolvedName: string
	metadata?: {
		title?: string | null
	} | null
}

/**
 * A pending LLM tag suggestion as returned by the API. Derived from the
 * generated fragment type to stay in sync with the schema.
 */
export type PendingTagSuggestion = LlmTagSuggestionFragment

export const displayNameForSuggestion = (suggestion: PendingTagSuggestion) =>
	suggestion.media?.metadata?.title || suggestion.media?.resolvedName || suggestion.mediaId

export const formatConfidence = (confidence: number) =>
	`${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`
