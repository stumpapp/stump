import { graphql } from '@stump/graphql'

export const LLM_TAG_SUGGESTION_FRAGMENT = graphql(`
	fragment LlmTagSuggestion on LlmTagSuggestion {
		id
		mediaId
		status
		createdAt
		suggestedTags {
			name
			confidence
			reason
		}
		appliedTags
		media {
			id
			resolvedName
			metadata {
				title
			}
		}
	}
`)
