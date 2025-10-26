package expo.modules.streamer

import android.util.Log
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ConcurrentHashMap

/**
 * Errors that can occur during streaming operations
 */
sealed class StreamerError : Exception() {
    data class ServerStartFailed(val reason: String) : StreamerError() {
        override val message: String get() = "Failed to start server: $reason"
    }

    data class ArchiveNotFound(val path: String) : StreamerError() {
        override val message: String get() = "Archive not found: $path"
    }

    data class ArchiveOpenFailed(val path: String, override val cause: Throwable) : StreamerError() {
        override val message: String get() = "Failed to open archive: $path - ${cause.message}"
    }

    data class PageNotFound(val page: Int) : StreamerError() {
        override val message: String get() = "Page $page not found in archive"
    }

    data class PageExtractionFailed(val page: Int, override val cause: Throwable) : StreamerError() {
        override val message: String get() = "Failed to extract page $page: ${cause.message}"
    }

    data class CacheDirectoryCreationFailed(override val cause: Throwable) : StreamerError() {
        override val message: String get() = "Failed to create cache directory: ${cause.message}"
    }
}

/**
 * Configuration for a book being streamed
 */
data class BookConfig(
    val bookId: String,
    val filePath: String,
    val cacheDir: String,
    // Cached list of image files in the archive (naturally sorted)
    var imageFiles: List<ZipArchive.Entry>? = null  
)

/**
 * Manages the HTTP server for streaming pages from ZIP/CBZ archives
 */
class StreamerServer private constructor() : NanoHTTPD("localhost", 0) {

    companion object {
        private const val TAG = "StreamerServer"
        val instance = StreamerServer()
    }

    /**
     * A cache of registered books (bookId -> BookConfig)
     */
    private val books = ConcurrentHashMap<String, BookConfig>()

    /**
     * Coroutine scope for background operations
     */
    private val extractionScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Whether the server is currently running
     */
    val isRunning: Boolean
        get() = isAlive

    /**
     * The port the server is running on
     */
    val serverPort: Int
        get() = listeningPort

    // MARK: - Server Lifecycle

    /**
     * Start the HTTP server if not already running
     * @return The actual port the server is running on
     * @throws StreamerError if server fails to start
     */
    fun startServer(): Int {
        if (isAlive) {
            return listeningPort
        }

        try {
            start(SOCKET_READ_TIMEOUT, false)
            Log.d(TAG, "Server started on port $listeningPort")
            return listeningPort
        } catch (e: Exception) {
            throw StreamerError.ServerStartFailed(e.message ?: "Unknown error")
        }
    }

    /**
     * Stop the HTTP server
     */
    fun stopServer() {
        stop()
        extractionScope.cancel()
        Log.d(TAG, "Server stopped")
    }

    // MARK: - Book Management

    /**
     * Register a book for streaming
     * @param config Book configuration
     * @throws StreamerError if archive not found or cache directory can't be created
     */
    fun registerBook(config: BookConfig) {
        val cleanFilePath = stripFilePrefix(config.filePath)
        val cleanCacheDir = stripFilePrefix(config.cacheDir)
        
        val file = File(cleanFilePath)
        if (!file.exists()) {
            throw StreamerError.ArchiveNotFound(cleanFilePath)
        }

        createCacheDirectoryIfNeeded(cleanCacheDir)

        val archive = try {
            ZipArchive(cleanFilePath)
        } catch (e: Exception) {
            throw StreamerError.ArchiveOpenFailed(cleanFilePath, e)
        }

        val imageFiles = archive.getImageFiles()
        archive.close()

        val updatedConfig = config.copy(
            filePath = cleanFilePath,
            cacheDir = cleanCacheDir,
            imageFiles = imageFiles
        )

        books[config.bookId] = updatedConfig
        Log.d(TAG, "Registered book ${config.bookId} with ${imageFiles.size} pages")
    }

    /**
     * Unregister a book and optionally clean up its cache
     * @param bookId The book ID to unregister
     * @param deleteCache Whether to delete cached pages
     */
    fun unregisterBook(bookId: String, deleteCache: Boolean = false) {
        val config = books.remove(bookId) ?: return

        if (deleteCache) {
            try {
                File(config.cacheDir).deleteRecursively()
                Log.d(TAG, "Deleted cache for book $bookId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete cache for book $bookId", e)
            }
        }

        Log.d(TAG, "Unregistered book $bookId")
    }

    /**
     * Get the URL for a specific page
     * @param bookId The book ID
     * @param page The page number (1-indexed)
     * @return The URL to access the page, or null if server not running
     */
    fun getPageURL(bookId: String, page: Int): String? {
        if (!isAlive) return null
        return "http://localhost:$listeningPort/books/$bookId/pages/$page"
    }

    /**
     * Get the number of pages in a book
     * @param bookId The book ID
     * @return The number of pages, or 0 if book not found
     */
    fun getPageCount(bookId: String): Int {
        val config = books[bookId] ?: return 0
        return config.imageFiles?.size ?: 0
    }

    // MARK: - Request Handling

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri

        // Parse page request: /books/{bookId}/pages/{page}
        val pathParts = uri.split("/").filter { it.isNotEmpty() }

        if (pathParts.size != 4 || pathParts[0] != "books" || pathParts[2] != "pages") {
            return newFixedLengthResponse(Response.Status.BAD_REQUEST, "text/plain", "Invalid path")
        }

        val bookId = pathParts[1]
        val pageNumber = pathParts[3].toIntOrNull() ?: return newFixedLengthResponse(
            Response.Status.BAD_REQUEST,
            "text/plain",
            "Invalid page number"
        )

        val config = books[bookId] ?: return newFixedLengthResponse(
            Response.Status.NOT_FOUND,
            "text/plain",
            "Book not found: $bookId"
        )

        val cacheDir = File(config.cacheDir)
        val cachedFiles = cacheDir.listFiles { file ->
            file.nameWithoutExtension == pageNumber.toString()
        }

        if (cachedFiles != null && cachedFiles.isNotEmpty()) {
            return serveCachedPage(cachedFiles[0])
        }

        // Cache miss so extract
        return try {
            extractAndServePage(config, pageNumber)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract page $pageNumber from $bookId", e)
            newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "text/plain",
                "Failed to extract page: ${e.message}"
            )
        }
    }

    // MARK: - Page Extraction

    /**
     * Extract a page from the archive and serve it
     */
    private fun extractAndServePage(config: BookConfig, page: Int): Response {
        val imageFiles = config.imageFiles ?: run {
            val archive = try {
                ZipArchive(config.filePath)
            } catch (e: Exception) {
                throw StreamerError.ArchiveOpenFailed(config.filePath, e)
            }
            
            val files = archive.getImageFiles()
            archive.close()
            files
        }

        if (page <= 0 || page > imageFiles.size) {
            throw StreamerError.PageNotFound(page)
        }

        // Note: page is 1-indexed
        val entry = imageFiles[page - 1]

        val archive = try {
            ZipArchive(config.filePath)
        } catch (e: Exception) {
            throw StreamerError.ArchiveOpenFailed(config.filePath, e)
        }

        val data = try {
            archive.extractEntry(entry)
        } catch (e: Exception) {
            archive.close()
            throw StreamerError.PageExtractionFailed(page, e)
        } finally {
            archive.close()
        }

        val extension = entry.name.substringAfterLast('.', "jpg")

        val cachedPath = getCachedPagePath(config, page, extension)
        try {
            FileOutputStream(cachedPath).use { output ->
                output.write(data)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to cache page $page", e)
        }

        val contentType = getContentType(entry.name)
        Log.d(TAG, "Extracted and served page $page for book ${config.bookId}")

        return newFixedLengthResponse(Response.Status.OK, contentType, data.inputStream(), data.size.toLong())
    }

    /**
     * Serve a page from cache
     */
    private fun serveCachedPage(file: File): Response {
        val contentType = getContentType(file.name)
        Log.d(TAG, "Served cached page at ${file.path}")
        return newFixedLengthResponse(
            Response.Status.OK,
            contentType,
            file.inputStream(),
            file.length()
        )
    }

    // MARK: - Helper Methods

    /**
     * Create cache directory if it doesn't exist
     */
    private fun createCacheDirectoryIfNeeded(path: String) {
        val dir = File(path)
        if (!dir.exists()) {
            try {
                dir.mkdirs()
            } catch (e: Exception) {
                throw StreamerError.CacheDirectoryCreationFailed(e)
            }
        }
    }

    /**
     * Get the cached page path with proper extension
     */
    private fun getCachedPagePath(config: BookConfig, page: Int, extension: String = "jpg"): String {
        return File(config.cacheDir, "$page.$extension").absolutePath
    }

    /**
     * Strip file:// prefix from path if present
     */
    private fun stripFilePrefix(path: String): String {
        return if (path.startsWith("file://")) {
            path.substring(7)
        } else {
            path
        }
    }

    /**
     * Determine content type from filename
     */
    private fun getContentType(filename: String): String {
        return when (filename.substringAfterLast('.').lowercase()) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            else -> "application/octet-stream"
        }
    }
}
