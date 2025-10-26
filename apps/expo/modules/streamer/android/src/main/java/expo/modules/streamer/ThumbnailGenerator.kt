package expo.modules.streamer

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import java.io.File
import java.io.FileOutputStream

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
 * Generates thumbnails from comic book archives
 */
class ThumbnailGenerator private constructor() {

    companion object {
        private const val TAG = "ThumbnailGenerator"
        private const val MAX_THUMBNAIL_SIZE = 300
        private const val JPEG_QUALITY = 80

        val instance = ThumbnailGenerator()

        private fun stripFilePrefix(path: String): String {
            return if (path.startsWith("file://")) {
                path.substring(7)
            } else {
                path
            }
        }
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

        val archive = try {
            ZipArchive(cleanArchivePath)
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

        val originalBitmap = try {
            BitmapFactory.decodeByteArray(imageData, 0, imageData.size)
                ?: throw IllegalStateException("BitmapFactory returned null")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode image", e)
            throw ThumbnailError.DecodingFailed(e)
        }

        val scaledBitmap = scaleBitmap(originalBitmap)
        
        if (originalBitmap != scaledBitmap) {
            originalBitmap.recycle()
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

    fun getThumbnailPath(bookId: String, outputDir: String): String {
        val cleanOutputDir = stripFilePrefix(outputDir)
        return File(cleanOutputDir, "$bookId.jpg").absolutePath
    }

    
    // TODO: This looks poop
    private fun scaleBitmap(original: Bitmap): Bitmap {
        val width = original.width
        val height = original.height

        if (width <= MAX_THUMBNAIL_SIZE && height <= MAX_THUMBNAIL_SIZE) {
            return original
        }

        val scale = if (width > height) {
            MAX_THUMBNAIL_SIZE.toFloat() / width.toFloat()
        } else {
            MAX_THUMBNAIL_SIZE.toFloat() / height.toFloat()
        }

        val newWidth = (width * scale).toInt()
        val newHeight = (height * scale).toInt()

        Log.d(TAG, "Scaling bitmap from ${width}x${height} to ${newWidth}x${newHeight}")

        return Bitmap.createScaledBitmap(original, newWidth, newHeight, true)
    }
}
