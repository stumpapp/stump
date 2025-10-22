import { requireNativeModule } from 'expo'

import type { StumpStreamerModule as NativeStumpStreamerModule } from './StumpStreamer.types'

// This call loads the native module object from the JSI.
const NativeModule = requireNativeModule<NativeStumpStreamerModule>('StumpStreamer')

class StumpStreamer {
	private nativeModule: NativeStumpStreamerModule
	private bookPorts: Map<string, number> = new Map()

	constructor(nativeModule: NativeStumpStreamerModule) {
		this.nativeModule = nativeModule
	}

	/**
	 * Initialize streaming for a book
	 *
	 * @param config Configuration for the book
	 * @returns Object containing the server port and success status
	 */
	async initializeBook(config: Parameters<NativeStumpStreamerModule['initializeBook']>[0]) {
		const result = await this.nativeModule.initializeBook(config)
		// Cache the port for this book
		this.bookPorts.set(config.bookId, result.port)
		return result
	}

	/**
	 * Get the URL for a specific page of a book
	 *
	 * @param bookId The ID of the book
	 * @param page The page number (1-indexed)
	 * @returns The URL to access the page, or null if book not found
	 */
	async getPageURL(bookId: string, page: number) {
		return this.nativeModule.getPageURL(bookId, page)
	}

	/**
	 * Helper function to get a book page URL (synchronously).
	 *
	 * @param bookId The ID of the book
	 * @param page The page number (1-indexed)
	 * @returns The URL to access the page
	 * @throws Error if the book hasn't been initialized
	 */
	bookPageUrl(bookId: string, page: number): string {
		const port = this.bookPorts.get(bookId)
		if (port === undefined) {
			throw new Error(`Book "${bookId}" has not been initialized. Call initializeBook() first.`)
		}
		return `http://localhost:${port}/books/${bookId}/pages/${page}`
	}

	/**
	 * Cleanup a book's resources and optionally delete its cached pages
	 *
	 * @param bookId The ID of the book to cleanup
	 * @param deleteCache Whether to delete cached pages (default: false)
	 */
	async cleanupBook(bookId: string, deleteCache: boolean = false) {
		await this.nativeModule.cleanupBook(bookId, deleteCache)
		this.bookPorts.delete(bookId)
	}

	/**
	 * Pre-fetch pages in the background to speed up subsequent loads
	 *
	 * @param bookId The ID of the book
	 * @param startPage The starting page number
	 * @param count Number of pages to prefetch
	 */
	async prefetchPages(bookId: string, startPage: number, count: number) {
		return this.nativeModule.prefetchPages(bookId, startPage, count)
	}

	/**
	 * Check if the streaming server is currently running
	 *
	 * @returns True if server is running, false otherwise
	 */
	isServerRunning() {
		return this.nativeModule.isServerRunning()
	}

	/**
	 * Stop the streaming server
	 */
	async stopServer() {
		await this.nativeModule.stopServer()
		this.bookPorts.clear()
	}
}

export default new StumpStreamer(NativeModule)
