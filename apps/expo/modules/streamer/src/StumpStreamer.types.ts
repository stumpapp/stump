export interface StumpStreamerModule {
	/**
	 * Initialize streaming for a book. Starts the HTTP server if not already running
	 * and registers the book for streaming.
	 * @param bookId The ID of the book
	 * @param archivePath Path to the archive file
	 * @param cacheDir Directory to use for caching extracted pages
	 * @returns The server port number
	 */
	initializeBook(bookId: string, archivePath: string, cacheDir: string): Promise<number>

	/**
	 * Get the URL for a specific page of a book
	 * @param bookId The ID of the book
	 * @param page The page number (1-indexed)
	 * @returns The URL to access the page, or null if book not found
	 */
	getPageURL(bookId: string, page: number): string | null

	/**
	 * Cleanup a book's resources and optionally delete its cached pages
	 * @param bookId The ID of the book to cleanup
	 * @param deleteCache Whether to delete cached pages (default: false)
	 */
	cleanupBook(bookId: string, deleteCache: boolean): Promise<void>

	/**
	 * Pre-fetch pages in the background to speed up subsequent loads
	 * @param bookId The ID of the book
	 * @param startPage The starting page number
	 * @param count Number of pages to prefetch
	 */
	prefetchPages(bookId: string, startPage: number, count: number): Promise<void>

	/**
	 * Check if the streaming server is currently running
	 * @returns True if server is running, false otherwise
	 */
	isServerRunning(): boolean

	/**
	 * Stop the streaming server
	 */
	stopServer(): Promise<void>

	/**
	 * Get the page count for an archive file without initializing the streamer
	 * @param filePath Path to the archive file
	 * @returns The number of pages in the archive
	 */
	getPageCount(filePath: string): Promise<number>
}
