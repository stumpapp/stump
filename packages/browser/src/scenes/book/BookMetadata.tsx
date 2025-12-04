import { graphql } from '@stump/graphql'

// TODO(graphql): Move this, it doesn't feel right here
export const BookFileInformationFragment = graphql(`
	fragment BookMetadata on Media {
		metadata {
			ageRating
			characters
			colorists
			coverArtists
			editors
			genres
			inkers
			letterers
			links
			pencillers
			publisher
			teams
			writers
			year
			month
			day
		}
	}
`)
