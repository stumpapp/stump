interface ReadProgress {
	/**
	 * The id of the media file this progress belongs to.
	 */
	media_id: number;
	/**
	 * The id of the user this progress belongs to.
	 */
	user_id: number;
	/**
	 * The current page the user is on.
	 */
	page: number;
}
