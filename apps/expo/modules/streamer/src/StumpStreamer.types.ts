/**
 * Configuration for initializing a book for streaming
 */
export type StreamerConfig = {
	/**
	 * Unique identifier for the book, should just be the ID from either:
	 * - Stump database (for books managed by Stump)
	 * - UUID from OPDS catalog
	 */
	bookId: string
	/**
	 * A local absolute path to the book file
	 */
	filePath: string
	/**
	 * The directory to use for caching extracted pages, should be managed by the
	 * main expo application
	 */
	cacheDir: string
}

/**
 * Result returned from initializing a book
 */
export type InitializeBookResult = {
	/**
	 * The port number the HTTP server is running on
	 **/
	port: number
	/**
	 * Whether the initialization was successful
	 **/
	success: boolean
}

export interface StumpStreamerModule {
	/**
	 * Initialize streaming for a book. Starts the HTTP server if not already running
	 * and registers the book for streaming.
	 * @param config Configuration for the book
	 * @returns Object containing the server port and success status
	 */
	initializeBook(config: StreamerConfig): Promise<InitializeBookResult>

	/**
	 * Get the URL for a specific page of a book
	 * @param bookId The ID of the book
	 * @param page The page number (1-indexed)
	 * @returns The URL to access the page, or null if book not found
	 */
	getPageURL(bookId: string, page: number): Promise<string | null>

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
}
