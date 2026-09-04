import type { QueryClient } from '@tanstack/react-query'

const THUMBNAIL_QUERY_KEYS = new Set([
	'bookClubBooks',
	'bookClubBySlug',
	'bookOverlay',
	'bookOverview',
	'bookReader',
	'booksAfterCursor',
	'booksSearch',
	'continueReading',
	'getMediaByPath',
	'lastVisitedLibrary',
	'libraryBooks',
	'libraryById',
	'librarySeries',
	'librarySeriesGrid',
	'mediaById',
	'onDeck',
	'readiumWebReader',
	'recentlyAddedMedia',
	'recentlyAddedSeries2',
	'seriesBookGrid',
	'seriesBooks',
	'seriesById',
	'smartListItems',
])

export const invalidateThumbnailQueries = (client: QueryClient) =>
	client.invalidateQueries({
		predicate: ({ queryKey: [rootKey] }) =>
			typeof rootKey === 'string' && THUMBNAIL_QUERY_KEYS.has(rootKey),
	})
