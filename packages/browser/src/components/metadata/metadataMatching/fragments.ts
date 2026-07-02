import { graphql } from '@stump/graphql'

// TODO: a CHONKER fragment, should prolly break it up

export const pendingMatchRecordFragment = graphql(`
	fragment PendingMatchRecord on MetadataFetchRecord {
		id
		status
		mediaId
		seriesId
		hadPartialResults
		matchCandidates {
			provider
			externalId
			metadata {
				__typename
				... on ExternalMediaMetadata {
					title
					seriesName
					seriesExternalId
					summary
					pageCount
					number
					day
					month
					year
					genres
					tags
					isbn
					isbn13
					writers
					artists
					colorists
					letterers
					coverArtists
				}
				... on ExternalSeriesMetadata {
					seriesTitle: title
					alternativeTitles
					summary
					volumeCount
					coverUrl
					status
					year
					endYear
					genres
					tags
					authors
					ageRating
					publisher
				}
			}
			confidence
			confidenceFactors {
				factor
				weight
				matched
			}
		}
		addedAt
		updatedAt
		media {
			id
			resolvedName
			metadata {
				title
				summary
				series
				number
				genres
				writers
				colorists
				letterers
				coverArtists
				publisher
				year
				month
				day
				pageCount
				identifierIsbn
				lockedFields
			}
		}
		series {
			id
			resolvedName
			metadata {
				title
				summary
				genres
				writers
				publisher
				year
				status
				ageRating
				volume
				lockedFields
			}
		}
	}
`)
