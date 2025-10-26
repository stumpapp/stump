import Foundation
import ReadiumGCDWebServer
import ZIPFoundation
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

    /// Cached list of image files in the archive (naturally sorted)
    let imageFiles: [Entry]
    
    init(bookId: String, filePath: String, cacheDir: String) throws {
        self.bookId = bookId
        self.filePath = filePath
        self.cacheDir = cacheDir
        
        let archive = try ZipArchive(path: filePath)
        self.imageFiles = archive.getImageFiles()
    }
}

/// Manages the HTTP server for streaming pages from ZIP/CBZ archives
class StreamerServer {
    static let shared = StreamerServer()

    private let logger = Logger(subsystem: "com.stump.streamer", category: "server")

    private var webServer: ReadiumGCDWebServer?

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

        let server = ReadiumGCDWebServer()

        // GET /books/{bookId}/pages/{page}
        server.addHandler(
            forMethod: "GET",
            pathRegex: "^/books/([^/]+)/pages/(\\d+)$",
            request: ReadiumGCDWebServerRequest.self
        ) { [weak self] request, completionBlock in
            guard let self = self else {
                completionBlock(ReadiumGCDWebServerErrorResponse(statusCode: 500))
                return
            }

            self.handlePageRequest(request: request, completionBlock: completionBlock)
        }

        let options: [String: Any] = [
            ReadiumGCDWebServerOption_Port: port,
            ReadiumGCDWebServerOption_BindToLocalhost: true,
            ReadiumGCDWebServerOption_AutomaticallySuspendInBackground: false
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
    /// - Parameters:
    ///   - bookId: The book ID
    ///   - filePath: Path to the archive file
    ///   - cacheDir: Directory to cache extracted pages
    func registerBook(bookId: String, filePath: String, cacheDir: String) throws {
        booksLock.lock()
        defer { booksLock.unlock() }

        guard FileManager.default.fileExists(atPath: filePath) else {
            throw StreamerError.archiveNotFound(filePath)
        }

        try createCacheDirectoryIfNeeded(at: cacheDir)

        let config = try BookConfig(bookId: bookId, filePath: filePath, cacheDir: cacheDir)
        
        books[bookId] = config
        logger.debug("Registered book \(bookId) with \(config.imageFiles.count) pages")
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

    /// Get the total number of pages for a book
    /// - Parameter bookId: The book ID
    /// - Returns: The number of pages, or nil if book not found
    func getPageCount(bookId: String) -> Int? {
        booksLock.lock()
        defer { booksLock.unlock() }
        
        return books[bookId]?.imageFiles.count
    }

    // MARK: - Request Handling

    /// Handle a page request
    private func handlePageRequest(request: ReadiumGCDWebServerRequest, completionBlock: @escaping ReadiumGCDWebServerCompletionBlock) {
        let path = request.path.components(separatedBy: "/").filter({ !$0.isEmpty })
        
        guard path.count >= 4,
              path[0] == "books",
              path[2] == "pages",
              let pageNumber = Int(path[3]) else {
            completionBlock(ReadiumGCDWebServerErrorResponse(statusCode: 400))
            return
        }

        let bookId = path[1]

        booksLock.lock()
        guard let config = books[bookId] else {
            booksLock.unlock()
            logger.warning("Book not found: \(bookId)")
            completionBlock(ReadiumGCDWebServerErrorResponse(statusCode: 404))
            return
        }
        booksLock.unlock()

        if let cachedPagePath = getCachedPagePath(config: config, page: pageNumber),
           FileManager.default.fileExists(atPath: cachedPagePath) {
            serveCachedPage(path: cachedPagePath, completionBlock: completionBlock)
            return
        }

        // Cache miss so extract
        extractionQueue.async {
            do {
                try self.extractAndServePage(config: config, page: pageNumber, completionBlock: completionBlock)
            } catch {
                self.logger.error("Failed to extract page \(pageNumber) from \(bookId): \(error.localizedDescription)")
                completionBlock(ReadiumGCDWebServerErrorResponse(statusCode: 500))
            }
        }
    }

    // MARK: - Page Extraction

    /// Extract a page from the archive and serve it
    private func extractAndServePage(config: BookConfig, page: Int, completionBlock: @escaping ReadiumGCDWebServerCompletionBlock) throws {
        let archive = try ZipArchive(path: config.filePath)

        // Use cached image files list
        let imageFiles = config.imageFiles

        guard page > 0 && page <= imageFiles.count else {
            throw StreamerError.pageNotFound(page)
        }

        // Note: page is 1-indexed
        let entry = imageFiles[page - 1]

        let data = try archive.extractEntry(entry)

        // TODO: This might be too aggressive? Maybe just serve the data if we can't write to cacheDir?
        guard let cachedPath = getCachedPagePath(config: config, page: page, originalFilename: entry.path) else {
            throw StreamerError.invalidArchiveFormat("Could not determine file extension for page \(page)")
        }
        
        try data.write(to: URL(fileURLWithPath: cachedPath))

        let contentType = getContentType(for: entry.path)
        let response = ReadiumGCDWebServerDataResponse(data: data, contentType: contentType)
        DispatchQueue.main.async {
            completionBlock(response)
        }

        logger.debug("Extracted and served page \(page) for book \(config.bookId)")
    }

    /// Serve a page from cache
    private func serveCachedPage(path: String, completionBlock: @escaping ReadiumGCDWebServerCompletionBlock) {
        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: path))
            let contentType = getContentType(for: path)
            let response = ReadiumGCDWebServerDataResponse(data: data, contentType: contentType)
            completionBlock(response)
            logger.debug("Served cached page at \(path)")
        } catch {
            logger.error("Failed to read cached page: \(error.localizedDescription)")
            completionBlock(ReadiumGCDWebServerErrorResponse(statusCode: 500))
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

    /// Get the cached page path with correct extension
    private func getCachedPagePath(config: BookConfig, page: Int, originalFilename: String? = nil) -> String? {
        if let filename = originalFilename {
            let ext = (filename as NSString).pathExtension
            guard !ext.isEmpty else { return nil }
            return (config.cacheDir as NSString).appendingPathComponent("\(page).\(ext)")
        } else {
            guard page > 0 && page <= config.imageFiles.count else { return nil }
            
            let entry = config.imageFiles[page - 1]
            let ext = (entry.path as NSString).pathExtension
            guard !ext.isEmpty else { return nil }
            
            return (config.cacheDir as NSString).appendingPathComponent("\(page).\(ext)")
        }
    }

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
        case "bmp":
            return "image/bmp"
        case "svg":
            return "image/svg+xml"
        case "tiff", "tif":
            return "image/tiff"
        default:
            return "application/octet-stream"
        }
    }
}
