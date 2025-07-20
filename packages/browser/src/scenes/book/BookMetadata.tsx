import { graphql } from '@stump/graphql'

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
		}
	}
`)
