import {
	authQueryKeys,
	jobQueryKeys,
	libraryQueryKeys,
	mediaQueryKeys,
	seriesQueryKeys,
} from '@stump/api'

export const QUERY_KEYS = {
	auth: {
		_group_prefix: 'auth',
		...authQueryKeys,
	},
	job: {
		_group_prefix: 'job',
		...jobQueryKeys,
	},
	library: {
		_group_prefix: 'library',
		...libraryQueryKeys,
	},
	media: {
		_group_prefix: 'media',
		...mediaQueryKeys,
		getMediaWithCursor: 'media.getMediaWithCursor',
	},
	series: {
		_group_prefix: 'series',
		...seriesQueryKeys,
	},
} as const
