import { Locale } from './Locale';

export enum ViewMode {
	Grid = 'GRID',
	List = 'LIST',
}

export interface UserPreferences {
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
	/**
	 * Whether the user wants to see the series in a library as a grid or list
	 */
	libraryViewMode: ViewMode;
	/**
	 * Whether the user wants to see the media in a series as a grid or list
	 */
	seriesViewMode: ViewMode;
	/**
	 * Whether the user wants to see the media in a collection as a grid or list
	 */
	collectionViewMode: ViewMode;
	/**
	 *
	 */
	locale: Locale;
}

export interface ServerPreferences {
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
