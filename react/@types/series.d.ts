interface Series {
	/**
	 * The id of the series.
	 */
	id: number;
	/**
	 * The id of the library this series belongs to.
	 */
	library_id: number;
	/**
	 * The name of the series. Either the directory name or extracted from the ComicInfo.xml file.
	 */
	title: string;
	/**
	 * The number of media files in the series.
	 */
	book_count: number;
	/**
	 * The date/time the series was last modified.
	 */
	updated_at: string;
	/**
	 * The path of the series on disk.
	 */
	path: string;
}

interface SeriesWithMedia extends Series {
	/**
	 * The media files in the series
	 */
	media: Media[];
}

type GetSeriesWithMedia = ApiResult<SeriesWithMedia, any>;
