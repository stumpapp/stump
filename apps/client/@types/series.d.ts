interface Series {
	/**
	 * The id of the series.
	 */
	id: string;
	/**
	 * The id of the library this series belongs to.
	 */
	libraryId: string;
	/**
	 * The name of the series. Either the directory name or extracted from the ComicInfo.xml file.
	 */
	name: string;
	/**
	 * The date/time the series was last modified.
	 */
	updatedAt: string;
	/**
	 * The path of the series on disk.
	 */
	path: string;
	/**
	 * The (optional) description of the series.
	 */
	description?: string;
	/**
	 * The media files in the series. Will be undefined only if the relation is not loaded.
	 * @see Media
	 */
	media?: Media[];
	/**
	 * The number of media files in the series. Will be undefined on errors.
	 */
	mediaCount?: number;
}
