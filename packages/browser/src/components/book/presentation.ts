import { LibraryType } from '@stump/graphql'

// TODO: i think there is more we can do wrt dynamically changing the presentation
// based on the library type, but this is just a small scoped start

export type BookPresentation = {
	credits: 'byline' | 'credits'
	positionLabel: (position: number | string) => string
}

const issue = (position: number | string) => `#${position}`

export function getBookPresentation(libraryType?: LibraryType | null): BookPresentation {
	switch (libraryType) {
		case LibraryType.Comic:
			return { credits: 'credits', positionLabel: issue }
		case LibraryType.Manga:
		case LibraryType.Manhwa:
			return { credits: 'credits', positionLabel: (position) => `Vol. ${position}` }
		case LibraryType.Webtoon:
			return { credits: 'credits', positionLabel: (position) => `Ch. ${position}` }
		default:
			return { credits: 'byline', positionLabel: issue }
	}
}
