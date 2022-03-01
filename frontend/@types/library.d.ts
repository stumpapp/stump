interface Library {
	/**
	 * The id of the library.
	 */
	id: number;
	/**
	 * The name of the library.
	 */
	name: string;
	/**
	 * The path of the library on disk.
	 */
	path: string;
}

interface LibraryWithSeries extends Library {
	series: Series[];
}

type GetLibrariesResponse = ApiResult<Library[], any>;
type GetLibraryWithSeries = ApiResult<LibraryWithSeries, any>;
