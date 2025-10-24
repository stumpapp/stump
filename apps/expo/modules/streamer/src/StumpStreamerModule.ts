import { requireNativeModule } from 'expo'

import type { StumpStreamerModule as NativeStumpStreamerModule } from './StumpStreamer.types'

// This call loads the native module object from the JSI.
const NativeModule = requireNativeModule<NativeStumpStreamerModule>('StumpStreamer')

class StumpStreamer {
	private nativeModule: NativeStumpStreamerModule

	constructor(nativeModule: NativeStumpStreamerModule) {
		this.nativeModule = nativeModule
	}

	/**
	 * Initialize streaming for a book
	 *
	 * @param bookId The ID of the book
	 * @param archivePath Path to the archive file
	 * @param cacheDir Directory to use for caching extracted pages
	 * @returns The server port number
	 */
	async initializeBook(bookId: string, archivePath: string, cacheDir: string) {
		const port = await this.nativeModule.initializeBook(bookId, archivePath, cacheDir)
		return { port, success: true }
	}

	/**
	 * Generate a thumbnail from the first valid page of an archive
	 *
	 * @param bookId The ID of the book (used for thumbnail filename)
	 * @param archivePath Path to the archive file (can be file:// URI or file system path)
	 * @param outputDir Directory where {bookId}.jpg will be saved
	 */
	async generateThumbnail(bookId: string, archivePath: string, outputDir: string) {
		await this.nativeModule.generateThumbnail(bookId, archivePath, outputDir)
	}

	/**
	 * Get the URL for a specific page of a book
	 *
	 * @param bookId The ID of the book
	 * @param page The page number (1-indexed)
	 * @returns The URL to access the page, or null if book not found
	 */
	getPageURL(bookId: string, page: number) {
		return this.nativeModule.getPageURL(bookId, page)
	}

	/**
	 * Cleanup a book's resources and optionally delete its cached pages
	 *
	 * @param bookId The ID of the book to cleanup
	 * @param deleteCache Whether to delete cached pages (default: false)
	 */
	async cleanupBook(bookId: string, deleteCache: boolean = false) {
		await this.nativeModule.cleanupBook(bookId, deleteCache)
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
	}

	/**
	 * Get the file URI for a thumbnail if it exists
	 *
	 * @param bookId The ID of the book
	 * @param cacheDir Directory where {bookId}.jpg would be located
	 * @returns File URI to {bookId}.jpg if it exists, null otherwise
	 */
	getThumbnailPath(bookId: string, cacheDir: string): string | null {
		return this.nativeModule.getThumbnailPath(bookId, cacheDir)
	}

	/**
	 * Get the page count for an archive file without initializing the streamer
	 *
	 * @param filePath Path to the archive file (can be file:// URI or file system path)
	 * @returns The number of pages in the archive
	 */
	async getPageCount(filePath: string): Promise<number> {
		return this.nativeModule.getPageCount(filePath)
	}
}

export default new StumpStreamer(NativeModule)
