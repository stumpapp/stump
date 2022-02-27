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

type GetLibrariesResponse = ApiResult<Library[], any>;
