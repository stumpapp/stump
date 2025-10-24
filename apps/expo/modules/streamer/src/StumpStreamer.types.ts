export interface StumpStreamerModule {
	initializeBook(bookId: string, archivePath: string, cacheDir: string): Promise<number>
	generateThumbnail(bookId: string, archivePath: string, outputDir: string): Promise<void>
	getPageURL(bookId: string, page: number): string | null
	cleanupBook(bookId: string, deleteCache: boolean): Promise<void>
	prefetchPages(bookId: string, startPage: number, count: number): Promise<void>
	isServerRunning(): boolean
	stopServer(): Promise<void>
	getThumbnailPath(bookId: string, cacheDir: string): string | null
	getPageCount(filePath: string): Promise<number>
}
