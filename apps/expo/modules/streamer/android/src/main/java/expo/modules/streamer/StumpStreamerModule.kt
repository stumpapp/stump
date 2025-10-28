package expo.modules.streamer

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StumpStreamerModule : Module() {
    private val server = StreamerServer.instance
    
    // Note: This took me forever to figure out, I am happy to not be a Kotlin dev lol
    private val thumbnailGenerator by lazy {
        ThumbnailGenerator.getInstance(appContext.reactContext!!)
    }

    override fun definition() = ModuleDefinition {
        Name("StumpStreamer")

        OnDestroy {
            cleanup()
        }

        AsyncFunction("initializeBook") { bookId: String, archivePath: String, cacheDir: String ->
            val port = server.startServer()

            val filePath = if (archivePath.startsWith("file://")) {
                archivePath.substring(7)
            } else {
                archivePath
            }

            val bookConfig = BookConfig(
                bookId = bookId,
                filePath = filePath,
                cacheDir = cacheDir
            )
            server.registerBook(bookConfig)

            port
        }

        Function("getPageURL") { bookId: String, page: Int ->
            server.getPageURL(bookId, page)
        }

        AsyncFunction("generateThumbnail") { bookId: String, archivePath: String, outputDir: String ->
            thumbnailGenerator.generateThumbnail(bookId, archivePath, outputDir)
        }

        Function("getThumbnailPath") { bookId: String, cacheDir: String ->
            val cachePath = if (cacheDir.startsWith("file://")) {
                cacheDir.substring(7)
            } else {
                cacheDir
            }
            
            val thumbnailPath = java.io.File(cachePath, "$bookId.jpg").absolutePath
            
            if (java.io.File(thumbnailPath).exists()) {
                "file://$thumbnailPath"
            } else {
                null
            }
        }

        AsyncFunction("getPageCount") { filePath: String ->
            val archivePath = if (filePath.startsWith("file://")) {
                filePath.substring(7)
            } else {
                filePath
            }
            
            val archive = ZipArchive(archivePath)
            val imageFiles = archive.getImageFiles()
            archive.close()
            imageFiles.size
        }

        AsyncFunction("cleanupBook") { bookId: String, deleteCache: Boolean ->
            server.unregisterBook(bookId, deleteCache)
        }

        Function("isServerRunning") {
            server.isRunning
        }

        AsyncFunction("stopServer") {
            server.stopServer()
        }
    }

    // MARK: - Lifecycle Management

    private fun cleanup() {
        server.stopServer()
    }
}
