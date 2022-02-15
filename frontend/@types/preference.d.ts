interface UserPreferences {
    /**
     * The id of the tuple in the database
     */
    id: number;
    /**
     * The id of the user this preference belongs to
     */
    user_id: number;
    /**
     * Boolean indicating whether the user wants dark mode
     */
    dark_mode: boolean;
}

interface ServerPreferences {
    // this won't be used, there is only one tuple in the database
    /**
     * The id of the tuple in the database
     */
    id: number;
    /**
     * Flag indicating whether or not to attempt to rename scanned series according to a ComicInfo.xml file inside the directory.
     * If none found, the series name will be the directory name. Default is false
     */
    rename_series: boolean;
    /**
     * Flag indicating whether or not to attempt to convert scanned .cbr files to .cbz files.
     */
    convert_cbr_to_cbz: boolean;
}
