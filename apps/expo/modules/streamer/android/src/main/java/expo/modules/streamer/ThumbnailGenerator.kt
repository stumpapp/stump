package expo.modules.streamer

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import expo.modules.readium.BookService
import kotlinx.coroutines.runBlocking
import java.io.File
import java.io.FileOutputStream
import java.net.URL

/**
 * Errors that can occur during thumbnail generation
 */
sealed class ThumbnailError : Exception() {
    object NoValidImages : ThumbnailError() {
        override val message: String get() = "No valid image files found in archive"
    }

    data class ExtractionFailed(override val cause: Throwable) : ThumbnailError() {
        override val message: String get() = "Failed to extract image from archive: ${cause.message}"
    }

    data class DecodingFailed(override val cause: Throwable) : ThumbnailError() {
        override val message: String get() = "Failed to decode image to bitmap: ${cause.message}"
    }

    data class SavingFailed(override val cause: Throwable) : ThumbnailError() {
        override val message: String get() = "Failed to save thumbnail: ${cause.message}"
    }
}

/**
 * Generates thumbnails from comic book archives and ebooks
 */
class ThumbnailGenerator private constructor(private val context: Context) {

    companion object {
        private const val TAG = "ThumbnailGenerator"
        // Note: This differs from iOS implementation since Swift automagically handles scaling for us
        private const val MAX_THUMBNAIL_SIZE_DP = 300
        private const val JPEG_QUALITY = 80

        // Note: This took me forever to figure out, I am happy to not be a Kotlin dev lol
        @Volatile
        private var INSTANCE: ThumbnailGenerator? = null

        fun getInstance(context: Context): ThumbnailGenerator {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ThumbnailGenerator(context.applicationContext).also {
                    INSTANCE = it
                }
            }
        }

        private fun stripFilePrefix(path: String): String {
            return if (path.startsWith("file://")) {
                path.substring(7)
            } else {
                path
            }
        }
    }

    private val bookService by lazy { BookService(context) }
    
    /**
     * Convert dp to pixels based on the device's density
     */
    private val maxThumbnailSizePixels: Int by lazy {
        val density = context.resources.displayMetrics.density
        (MAX_THUMBNAIL_SIZE_DP * density).toInt()
    }

    /**
     * Generate a thumbnail for a book
     * 
     * @param bookId Unique identifier for the book
     * @param archivePath Path to the archive file
     * @param outputDir Directory to save the thumbnail
     * @return Path to the generated thumbnail
     * @throws ThumbnailError if generation fails
     */
    fun generateThumbnail(
        bookId: String,
        archivePath: String,
        outputDir: String
    ): String {
        val cleanArchivePath = stripFilePrefix(archivePath)
        val cleanOutputDir = stripFilePrefix(outputDir)

        Log.d(TAG, "Generating thumbnail for book $bookId")

        val outputDirectory = File(cleanOutputDir)
        if (!outputDirectory.exists()) {
            outputDirectory.mkdirs()
        }

        val fileExtension = File(cleanArchivePath).extension.lowercase()
        val isReadiumRequired = fileExtension == "epub" || fileExtension == "pdf"

        val bitmap = if (isReadiumRequired) {
            extractReadiumCover(cleanArchivePath)
        } else {
            extractZipCover(cleanArchivePath)
        }

        val scaledBitmap = scaleBitmap(bitmap)
        
        if (bitmap != scaledBitmap) {
            bitmap.recycle()
        }

        val thumbnailPath = getThumbnailPath(bookId, cleanOutputDir)
        try {
            FileOutputStream(thumbnailPath).use { stream ->
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, stream)
            }
            Log.d(TAG, "Thumbnail saved to: $thumbnailPath")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save thumbnail", e)
            throw ThumbnailError.SavingFailed(e)
        } finally {
            scaledBitmap.recycle()
        }

        return thumbnailPath
    }

    /**
     * Extract cover from a zip archive (CBZ, ZIP)
     */
    private fun extractZipCover(archivePath: String): Bitmap {
        val archive = try {
            ZipArchive(archivePath)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open archive", e)
            throw ThumbnailError.ExtractionFailed(e)
        }

        val imageFiles = archive.getImageFiles()
        if (imageFiles.isEmpty()) {
            archive.close()
            throw ThumbnailError.NoValidImages
        }

        val firstImage = imageFiles[0]
        Log.d(TAG, "Using first image: ${firstImage.name}")

        val imageData = try {
            archive.extractEntry(firstImage)
        } catch (e: Exception) {
            archive.close()
            Log.e(TAG, "Failed to extract image", e)
            throw ThumbnailError.ExtractionFailed(e)
        } finally {
            archive.close()
        }

        return try {
            BitmapFactory.decodeByteArray(imageData, 0, imageData.size)
                ?: throw IllegalStateException("BitmapFactory returned null")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode image", e)
            throw ThumbnailError.DecodingFailed(e)
        }
    }

    /**
     * Extract cover from an EPUB/PDF, falling back to ZIP extraction if needed
     */
    private fun extractReadiumCover(archivePath: String): Bitmap {
        return runBlocking {
            val fileUrl = URL("file://$archivePath")
            
            val coverBitmap = bookService.getCoverImage(fileUrl)
            
            if (coverBitmap != null) {
                Log.d(TAG, "Successfully extracted cover: ${coverBitmap.width}x${coverBitmap.height}")
                coverBitmap
            } else {
                if (archivePath.lowercase().endsWith(".pdf")) {
                    throw ThumbnailError.ExtractionFailed(
                        IllegalStateException("PDF cover extraction failed")
                    )
                }
                Log.w(TAG, "Failed to extract cover, falling back to ZIP extraction")
                extractZipCover(archivePath)
            }
        }
    }

    fun getThumbnailPath(bookId: String, outputDir: String): String {
        val cleanOutputDir = stripFilePrefix(outputDir)
        return File(cleanOutputDir, "$bookId.jpg").absolutePath
    }

    /**
     * Scale a bitmap to fit within maxThumbnailSizePixels while maintaining aspect ratio
     */
    private fun scaleBitmap(original: Bitmap): Bitmap {
        val width = original.width
        val height = original.height

        if (width <= maxThumbnailSizePixels && height <= maxThumbnailSizePixels) {
            return original
        }

        val scale = minOf(
            maxThumbnailSizePixels.toFloat() / width.toFloat(),
            maxThumbnailSizePixels.toFloat() / height.toFloat()
        )

        val newWidth = (width * scale).toInt()
        val newHeight = (height * scale).toInt()

        Log.d(TAG, "Scaling bitmap from ${width}x${height} to ${newWidth}x${newHeight}")

        val scaledBitmap = Bitmap.createBitmap(newWidth, newHeight, Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(scaledBitmap)
        
        val paint = android.graphics.Paint().apply {
            isAntiAlias = true
            isFilterBitmap = true
            isDither = true
        }
        
        val srcRect = android.graphics.Rect(0, 0, width, height)
        val dstRect = android.graphics.Rect(0, 0, newWidth, newHeight)
        
        canvas.drawBitmap(original, srcRect, dstRect, paint)
        
        return scaledBitmap
    }
}
