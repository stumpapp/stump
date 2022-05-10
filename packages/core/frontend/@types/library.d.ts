interface Library {
	/**
	 * The id of the library.
	 */
	id: string;
	/**
	 * The name of the library.
	 */
	name: string;
	/**
	 * The path of the library on disk.
	 */
	path: string;
	/**
	 * The (optional) description of the library.
	 */
	description?: string;
}

interface LibraryWithSeries extends Library {
	/**
	 * The series in the library
	 * @see Series
	 * @see SeriesWithMedia
	 */
	series: SeriesWithMedia[];
}

type GetLibrariesResponse = ApiResult<Library[], any>;
type GetLibraryWithSeries = ApiResult<LibraryWithSeries, any>;
