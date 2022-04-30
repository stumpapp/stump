interface UserPreferences {
	/**
	 * The id of the tuple in the database
	 */
	id: string;
	/**
	 * The id of the user this preference belongs to
	 */
	userId: string;
	/**
	 * Boolean indicating whether the user wants dark mode
	 */
	darkMode: boolean;
}

interface ServerPreferences {
	// this won't be used, there is only one tuple in the database
	/**
	 * The id of the tuple in the database
	 */
	id: string;
	/**
	 * Flag indicating whether or not to attempt to rename scanned series according to a ComicInfo.xml file inside the directory.
	 * If none found, the series name will be the directory name. Default is false
	 */
	renameSeries: boolean;
	/**
	 * Flag indicating whether or not to attempt to convert scanned .cbr files to .cbz files.
	 */
	convertCbrToCbz: boolean;
}
