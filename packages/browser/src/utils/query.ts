import type { QueryClient } from '@tanstack/react-query'

const THUMBNAIL_QUERY_KEYS = new Set([
	'bookClubBooks',
	'bookClubBySlug',
	'bookOverlay',
	'bookOverview',
	'bookOverviewHeader',
	'bookReader',
	'booksAfterCursor',
	'booksSearch',
	'continueReading',
	'getMediaByPath',
	'lastVisitedLibrary',
	'libraryBooks',
	'libraryById',
	'librarySeries',
	'librarySeriesAlphabet',
	'libraryBooksAlphabet',
	'librarySeriesGrid',
	'mediaById',
	'onDeck',
	'readiumWebReader',
	'recentlyAddedMedia',
	'recentlyAddedSeries2',
	'seriesBookGrid',
	'seriesBooks',
	'seriesBooksAlphabet',
	'seriesById',
	'smartListItems',
])

export const invalidateThumbnailQueries = (client: QueryClient) =>
	client.invalidateQueries({
		predicate: ({ queryKey: [rootKey] }) =>
			typeof rootKey === 'string' && THUMBNAIL_QUERY_KEYS.has(rootKey),
	})
