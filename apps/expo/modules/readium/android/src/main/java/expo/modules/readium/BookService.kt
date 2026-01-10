package expo.modules.readium

import android.content.Context
import android.util.Log
import org.readium.r2.shared.publication.Link
import org.readium.r2.shared.publication.Locator
import org.readium.r2.shared.publication.Publication
import org.readium.r2.shared.publication.services.cover
import org.readium.r2.shared.publication.services.isRestricted
import org.readium.r2.shared.publication.services.positions
import org.readium.r2.shared.publication.services.protectionError
import org.readium.r2.shared.util.asset.AssetRetriever
import org.readium.r2.shared.util.data.ReadTry
import org.readium.r2.shared.util.getOrElse
import org.readium.r2.streamer.PublicationOpener
import org.readium.r2.shared.util.http.DefaultHttpClient
import org.readium.r2.shared.util.resource.Resource
import org.readium.r2.streamer.parser.DefaultPublicationParser
import org.readium.adapter.pdfium.document.PdfiumDocumentFactory
import java.io.File
import java.net.URL
import java.util.zip.ZipFile

sealed class BookServiceError : Exception() {

    data class AssetRetrievalFailed(val error: AssetRetriever.RetrieveError) : BookServiceError() {
        override val message: String
            get() = "Failed to retrieve asset: ${error.message}"
    }
    data class PublicationNotFound(val bookId: String) : BookServiceError() {
        override val message: String
            get() = "Publication not found for book ID: $bookId"
    }
    
    data class OpenFailed(val error: Throwable) : BookServiceError() {
        override val message: String
            get() = "Failed to open publication: ${error.message}"
    }
    
    data class PublicationRestricted(val bookId: String) : BookServiceError() {
        override val message: String
            get() = "Publication is restricted for book ID: $bookId"
    }
    
    data class RestrictedPublication(val reason: String) : BookServiceError() {
        override val message: String
            get() = "Publication access restricted: $reason"
    }
    
    data class ExtractFailed(val archiveUrl: URL, val reason: String) : BookServiceError() {
        override val message: String
            get() = "Failed to extract archive $archiveUrl: $reason"
    }
}

class BookService(private val context: Context) {

    /// An instance of AssetRetriever for accessing publication assets
    private val assetRetriever: AssetRetriever
    
    /// An instance of PublicationOpener for opening publications
    private val publicationOpener: PublicationOpener

    /// A cache of publications, keyed by their identifier. A publication is added
    /// to the cache when it is opened
    private val publications: MutableMap<String, Publication> = mutableMapOf()

    init {
        val httpClient = DefaultHttpClient()
        
        assetRetriever = AssetRetriever(context.contentResolver, httpClient)
        
        val pdfFactory = PdfiumDocumentFactory(context)
        
        val publicationParser = DefaultPublicationParser(
            context,
            httpClient,
            assetRetriever,
            pdfFactory
        )
        
        publicationOpener = PublicationOpener(publicationParser)
    }

    /**
     * Extracts an archive (EPUB) to a directory
     */
    fun extractArchive(archiveUrl: URL, extractedUrl: URL) {
        println("Extracting archive from: $archiveUrl to: $extractedUrl")
        
        try {
            // Create the extraction directory only if it doesn't alreadt exist
            val extractDir = File(extractedUrl.path)
            if (!extractDir.exists()) {
                extractDir.mkdirs()
            }
            
            ZipFile(archiveUrl.path).use { zip ->
                zip.entries().asSequence()
                    .filterNot { it.isDirectory }
                    .forEach { entry ->
                        zip.getInputStream(entry).use { input ->
                            val newFile = File(extractedUrl.path, entry.name)
                            newFile.parentFile?.mkdirs()
                            newFile.outputStream().use { output ->
                                input.copyTo(output)
                            }
                        }
                    }
            }
            println("Successfully extracted archive")
        } catch (error: Exception) {
            println("Extract failed: ${error.message}")
            throw BookServiceError.ExtractFailed(archiveUrl, error.message ?: "Unknown error")
        }
    }

    /**
     * Opens a publication from a local EPUB file or directory
     */
    suspend fun openPublication(bookId: String, url: URL): Publication {
        println("Opening publication for bookId: $bookId at: $url")
        
        val file = File(url.path)
        require(file.exists()) { "File does not exist: ${url.path}" }

        val asset = assetRetriever.retrieve(file)
            .getOrElse { error ->
                println("Failed to retrieve asset: $error")
                throw BookServiceError.AssetRetrievalFailed(error)
            }
        
        println("Opening publication with media type: ${asset.format.mediaType}")

        val publication = publicationOpener.open(
            asset = asset, 
            allowUserInteraction = false
        ).getOrElse { error -> 
            println("Failed to open publication: $error")
            throw BookServiceError.OpenFailed(Exception(error.toString()))
        }
        
        println("Successfully opened publication: ${publication.metadata.title}")
        
        validatePublication(publication)
        
        publications[bookId] = publication
        return publication
    }

    /**
     * Gets a publication by book ID
     */
    fun getPublication(bookId: String): Publication? {
        return publications[bookId]
    }

    /**
     * Closes and removes a publication from the cache
     */
    fun closePublication(bookId: String) {
        if (publications.remove(bookId) != null) {
            Log.d("BookService", "Closed and removed publication for book: $bookId")
        }
    }

    /**
     * Clears all publications from the cache
     */
    fun clearCache() {
        val count = publications.size
        publications.clear()
        Log.d("BookService", "Cleared cache ($count publications removed)")
    }

    /**
     * Gets a resource from a publication
     */
    fun getResource(bookId: String, link: Link): Resource? {
        val publication = getPublication(bookId)
            ?: throw BookServiceError.PublicationNotFound(bookId)
        return publication.get(link)
    }

    /**
     * Gets positions for a publication
     */
    suspend fun getPositions(bookId: String): List<Locator> {
        val publication = getPublication(bookId)
            ?: throw BookServiceError.PublicationNotFound(bookId)
        return publication.positions()
    }

    /**
     * Locates a link within a publication
     */
    fun locateLink(bookId: String, link: Link): Locator? {
        val publication = getPublication(bookId) ?: return null
        return publication.locatorFromLink(link)
    }
    
    /**
     * Gets the page count for a publication (EPUB or PDF)
     * @param url The URL of the publication file
     * @return The number of pages, or null if positions cannot be retrieved
     */
    suspend fun getPageCount(url: URL): Int? {
        return try {
            val file = File(url.path)
            if (!file.exists()) {
                Log.w("BookService", "File does not exist: ${url.path}")
                return null
            }

            val asset = assetRetriever.retrieve(file).getOrElse { error ->
                Log.w("BookService", "Failed to retrieve asset: $error")
                return null
            }

            val publication = publicationOpener.open(
                asset = asset,
                allowUserInteraction = false
            ).getOrElse { error ->
                Log.w("BookService", "Failed to open publication: $error")
                return null
            }

            publication.positions().size
        } catch (e: Exception) {
            Log.e("BookService", "Failed to get page count", e)
            null
        }
    }
    
    /**
     * Extracts the cover image from an EPUB
     * @param url The URL of the EPUB file
     * @return The cover image as a Bitmap, or null if no cover is found
     */
    suspend fun getCoverImage(url: URL): android.graphics.Bitmap? {
        val file = File(url.path)
        if (!file.exists()) {
            Log.w("BookService", "File does not exist: ${url.path}")
            return null
        }

        return try {
            val asset = assetRetriever.retrieve(file).getOrElse { error ->
                Log.w("BookService", "Failed to retrieve asset: $error")
                return null
            }

            val publication = publicationOpener.open(
                asset = asset,
                allowUserInteraction = false
            ).getOrElse { error ->
                Log.w("BookService", "Failed to open publication: $error")
                return null
            }

            publication.cover()
        } catch (e: Exception) {
            Log.e("BookService", "Failed to extract cover", e)
            null
        }
    }

    /**
     * A helper method to assert that a publication is not restricted since
     * we won't support locked publications
     */
    private fun validatePublication(publication: Publication) {
        if (publication.isRestricted) {
            val error = publication.protectionError
            if (error != null) {
                throw BookServiceError.RestrictedPublication(error.message ?: "Unknown protection error")
            } else {
                throw BookServiceError.RestrictedPublication(
                    "Publication is restricted but no specific error was provided"
                )
            }
        }
    }
}
