interface ReadProgress {
	/**
	 * The id of the media file this progress belongs to.
	 */
	mediaId: number;
	/**
	 * The id of the user this progress belongs to.
	 */
	userId: number;
	/**
	 * The current page the user is on.
	 */
	page: number;
}
