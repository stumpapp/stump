export const STUMP_SAVE_BASIC_SESSION_HEADER = 'X-Stump-Save-Session'

// TODO(prettier): Figure out why key sort isn't working here

export const cacheKeys = {
	seriesBooks: 'seriesBooks',
	seriesById: 'seriesById',
	seriesLinks: 'seriesLinks',
	libraries: 'libraries',
	libraryById: 'libraryById',
	libraryBooks: 'libraryBooks',
	librarySeries: 'librarySeries',
	libraryOverview: 'libraryOverview',
	scanHistory: 'scanHistory',
	numberOfLibraries: 'numberOfLibraries',
	bookReader: 'bookReader',
	emailDevices: 'emailDevices',
	bookOverview: 'bookOverview',
	bookOverviewHeader: 'bookOverviewHeader',
	sidebar: 'sidebar',
	tags: 'tags',
} as const
