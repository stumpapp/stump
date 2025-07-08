export const STUMP_SAVE_BASIC_SESSION_HEADER = 'X-Stump-Save-Session'

// TODO(prettier): Figure out why key sort isn't working here

export const cacheKeys = {
	series: 'series',
	seriesBooks: 'seriesBooks',
	seriesById: 'seriesById',
	seriesLinks: 'seriesLinks',
	recentlyAddedSeries: 'recentlyAddedSeries',
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
	getStats: 'getStats',
	recentlyAddedMedia: 'recentlyAddedMedia',
	media: 'media',
	apiKeys: 'apiKeys',
	logs: 'logs',
	jobs: 'jobs',
	scheduler: 'jobScheduler',
} as const
