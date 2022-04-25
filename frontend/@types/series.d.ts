interface Series {
	/**
	 * The id of the series.
	 */
	id: number;
	/**
	 * The id of the library this series belongs to.
	 */
	libraryId: number;
	/**
	 * The name of the series. Either the directory name or extracted from the ComicInfo.xml file.
	 */
	title: string;
	/**
	 * The number of media files in the series. This is not part of the SeaORM model,
	 * and will be populated with an aggregate subquery in the backend.
	 */
	bookCount?: number;
	/**
	 * The date/time the series was last modified.
	 */
	updatedAt: string;
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
