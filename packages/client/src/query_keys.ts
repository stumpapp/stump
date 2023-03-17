export const QUERY_KEYS = {
	job: {
		_group_prefix: 'job',
		get: 'job.get',
		get_by_id: 'job.get_by_id',
	},
	library: {
		_group_prefix: 'library',
		create: 'library.create',
		delete: 'library.delete',
		get: 'library.get',
		get_by_id: 'library.get_by_id',
		scan: 'library.scan',
		series: 'library.series',
		stats: 'library.stats',
		update: 'library.update',
	},
	media: {
		_group_prefix: 'media',
		get: 'media.get',
		get_by_id: 'media.get_by_id',
		get_with_cursor: 'media.get_with_cursor',
		in_progress: 'media.in_progress',
		recently_added: 'media.recently_added',
	},
	series: {
		_group_prefix: 'series',
		get: 'series.get',
		get_by_id: 'series.get_by_id',
		media: 'series.media',
		recently_added: 'series.recently_added',
		up_next: 'series.up_next',
	},
}
