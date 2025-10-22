import Foundation
import ReadiumGCDWebServer
import os.log

/// Errors that can occur during streaming operations
enum StreamerError: Error {
    case serverStartFailed(String)
    case archiveNotFound(String)
    case archiveOpenFailed(String, Error)
    case pageNotFound(Int)
    case pageExtractionFailed(Int, Error)
    case invalidArchiveFormat(String)
    case cacheDirectoryCreationFailed(Error)
}

/// Configuration for a book being streamed
struct BookConfig {
    let bookId: String
    let filePath: String
    let cacheDir: String
}

/// Manages the HTTP server for streaming pages from ZIP/CBZ archives
class StreamerServer {
    static let shared = StreamerServer()

    private let logger = Logger(subsystem: "com.stump.streamer", category: "server")

    private var webServer: GCDWebServer?

    /// A cache of registered books (bookId -> BookConfig)
    private var books: [String: BookConfig] = [:]

    // TODO: Explore if better options in Swift
    /// Lock for thread-safe access to books
    private let booksLock = NSLock()

    /// Dispatch queue for background ZIP operations
    private let extractionQueue = DispatchQueue(label: "com.stump.streamer.extraction", qos: .userInitiated, attributes: .concurrent)

    // Note: Apparently 0 means auto-assign which is best I think
    private var port: UInt = 0

    /// Whether the server is currently running
    var isRunning: Bool {
        webServer?.isRunning ?? false
    }

    private init() {}

    // MARK: - Server Lifecycle

    /// Start the HTTP server if not already running
    /// - Parameter port: Port to use (0 for auto-assign)
    /// - Returns: The actual port the server is running on
    /// - Throws: StreamerError if server fails to start
    func startServer(port: UInt = 0) throws -> UInt {
        if isRunning {
            return self.port
        }

        let server = GCDWebServer()

        // GET /books/{bookId}/pages/{page}
        server.addHandler(
            forMethod: "GET",
            pathRegex: "^/books/([^/]+)/pages/(\\d+)$",
            request: GCDWebServerRequest.self
        ) { [weak self] request, completionBlock in
            guard let self = self else {
                completionBlock(GCDWebServerErrorResponse(statusCode: 500))
                return
            }

            self.handlePageRequest(request: request, completionBlock: completionBlock)
        }

        var options: [String: Any] = [
            GCDWebServerOption_Port: port,
            GCDWebServerOption_BindToLocalhost: true,
            GCDWebServerOption_AutomaticallySuspendInBackground: false
        ]

        do {
            try server.start(options: options)
            self.webServer = server
            self.port = server.port
            logger.info("Started on port \(server.port)")
            return server.port
        } catch {
            logger.error("Failed to start server: \(error.localizedDescription)")
            throw StreamerError.serverStartFailed("Failed to start server: \(error.localizedDescription)")
        }
    }

    /// Stop the HTTP server
    func stopServer() {
        webServer?.stop()
        webServer = nil
        port = 0
        logger.info("Stopped")
    }

    // MARK: - Book Management

    /// Register a book for streaming
    /// - Parameter config: Book configuration
    func registerBook(config: BookConfig) throws {
        booksLock.lock()
        defer { booksLock.unlock() }

        // Verify the archive exists
        guard FileManager.default.fileExists(atPath: config.filePath) else {
            throw StreamerError.archiveNotFound(config.filePath)
        }

        // Create cache directory if needed
        try createCacheDirectoryIfNeeded(at: config.cacheDir)

        books[config.bookId] = config
        logger.debug("Registered book \(config.bookId)")
    }

    /// Unregister a book and optionally clean up its cache
    /// - Parameters:
    ///   - bookId: The book ID to unregister
    ///   - deleteCache: Whether to delete cached pages
    func unregisterBook(bookId: String, deleteCache: Bool = false) {
        booksLock.lock()
        defer { booksLock.unlock() }

        guard let config = books[bookId] else { return }

        if deleteCache {
            try? FileManager.default.removeItem(atPath: config.cacheDir)
            logger.debug("Deleted cache for book \(bookId)")
        }

        books.removeValue(forKey: bookId)
        logger.debug("Unregistered book \(bookId)")
    }

    /// Get the URL for a specific page
    /// - Parameters:
    ///   - bookId: The book ID
    ///   - page: The page number (1-indexed)
    /// - Returns: The URL to access the page
    func getPageURL(bookId: String, page: Int) -> String? {
        guard isRunning else { return nil }
        return "http://localhost:\(port)/books/\(bookId)/pages/\(page)"
    }

    // MARK: - Request Handling

    /// Handle a page request
    private func handlePageRequest(request: GCDWebServerRequest, completionBlock: @escaping GCDWebServerCompletionBlock) {
        let path = request.path.components(separatedBy: "/").filter({ !$0.isEmpty })
        
        guard path.count >= 4,
              path[0] == "books",
              path[2] == "pages",
              let pageNumber = Int(path[3]) else {
            completionBlock(GCDWebServerErrorResponse(statusCode: 400))
            return
        }

        let bookId = path[1]

        booksLock.lock()
        guard let config = books[bookId] else {
            booksLock.unlock()
            logger.warning("Book not found: \(bookId)")
            completionBlock(GCDWebServerErrorResponse(statusCode: 404))
            return
        }
        booksLock.unlock()

        // Try to serve from cache first
        let cachedPagePath = getCachedPagePath(config: config, page: pageNumber)
        if FileManager.default.fileExists(atPath: cachedPagePath) {
            serveCachedPage(path: cachedPagePath, completionBlock: completionBlock)
            return
        }

        // Miss so extract it
        extractionQueue.async {
            do {
                try self.extractAndServePage(config: config, page: pageNumber, completionBlock: completionBlock)
            } catch {
                self.logger.error("Failed to extract page \(pageNumber) from \(bookId): \(error.localizedDescription)")
                completionBlock(GCDWebServerErrorResponse(statusCode: 500))
            }
        }
    }

    // MARK: - Page Extraction

    /// Extract a page from the archive and serve it
    private func extractAndServePage(config: BookConfig, page: Int, completionBlock: @escaping GCDWebServerCompletionBlock) throws {
        let archive = try ZipArchive(path: config.filePath)

        // TODO: Might be good to cache this list for easier access of pages without fucking with determining extensions
        // and just for fewer io ops
        let imageFiles = archive.getImageFiles()

        guard page > 0 && page <= imageFiles.count else {
            throw StreamerError.pageNotFound(page)
        }

        // Note: page is 1-indexed
        let entry = imageFiles[page - 1]

        let data = try archive.extractEntry(entry)

        let cachedPath = getCachedPagePath(config: config, page: page)
        try data.write(to: URL(fileURLWithPath: cachedPath))

        let contentType = getContentType(for: entry.filename)
        let response = GCDWebServerDataResponse(data: data, contentType: contentType)
        DispatchQueue.main.async {
            completionBlock(response)
        }

        logger.debug("Extracted and served page \(page) for book \(config.bookId)")
    }

    /// Serve a page from cache
    private func serveCachedPage(path: String, completionBlock: @escaping GCDWebServerCompletionBlock) {
        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: path))
            let contentType = getContentType(for: path)
            let response = GCDWebServerDataResponse(data: data, contentType: contentType)
            completionBlock(response)
            logger.debug("Served cached page at \(path)")
        } catch {
            logger.error("Failed to read cached page: \(error.localizedDescription)")
            completionBlock(GCDWebServerErrorResponse(statusCode: 500))
        }
    }

    // MARK: - Helper Methods

    /// Create cache directory if it doesn't exist
    private func createCacheDirectoryIfNeeded(at path: String) throws {
        let url = URL(fileURLWithPath: path)
        if !FileManager.default.fileExists(atPath: path) {
            do {
                try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            } catch {
                throw StreamerError.cacheDirectoryCreationFailed(error)
            }
        }
    }

    // FIXME: Don't assume jpg aaron
    /// Get the cached page path
    private func getCachedPagePath(config: BookConfig, page: Int) -> String {
        return (config.cacheDir as NSString).appendingPathComponent("\(page).jpg")
    }

    // TODO: This is probably fine but should I add more types?
    /// Determine content type from filename
    private func getContentType(for filename: String) -> String {
        let ext = (filename as NSString).pathExtension.lowercased()
        switch ext {
        case "jpg", "jpeg":
            return "image/jpeg"
        case "png":
            return "image/png"
        case "gif":
            return "image/gif"
        case "webp":
            return "image/webp"
        default:
            return "application/octet-stream"
        }
    }
}
