package expo.modules.streamer

import android.util.Log
import java.io.File
import java.io.InputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipFile

/**
 * A simple ZIP archive wrapper for extracting image files
 */
class ZipArchive(private val path: String) {

    companion object {
        private const val TAG = "ZipArchive"

        /**
         * Supported image extensions
         */
        private val IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "gif", "webp", "bmp")
    }

    private val zipFile: ZipFile = try {
        ZipFile(File(path))
    } catch (e: Exception) {
        throw StreamerError.ArchiveOpenFailed(path, e)
    }

    /**
     * Data class representing a ZIP entry with its metadata
     */
    data class Entry(
        val name: String,
        val zipEntry: ZipEntry
    )

    /**
     * Get all image files from the archive, sorted by name
     */
    fun getImageFiles(): List<Entry> {
        val imageEntries = mutableListOf<Entry>()

        zipFile.entries().asSequence().forEach { zipEntry ->
            val filename = zipEntry.name

            if (zipEntry.isDirectory) {
                return@forEach
            }

            val extension = filename.substringAfterLast('.', "").lowercase()
            if (!IMAGE_EXTENSIONS.contains(extension)) {
                return@forEach
            }

            if (isHiddenFile(filename)) {
                return@forEach
            }

            imageEntries.add(Entry(filename, zipEntry))
        }

        imageEntries.sortWith(compareBy(naturalOrder()) {
            File(it.name).name
        })

        Log.d(TAG, "Found ${imageEntries.size} image files in archive")
        return imageEntries
    }

    /**
     * Extract an entry's data
     */
    fun extractEntry(entry: Entry): ByteArray {
        return try {
            zipFile.getInputStream(entry.zipEntry).use { input ->
                input.readBytes()
            }
        } catch (e: Exception) {
            throw StreamerError.PageExtractionFailed(0, e)
        }
    }

    /**
     * Check if a file is hidden (starts with . or is in __MACOSX)
     */
    private fun isHiddenFile(path: String): Boolean {
        val pathComponents = path.split("/")
        return pathComponents.any { component ->
            component.startsWith(".") || component == "__MACOSX"
        }
    }

    /**
     * Close the archive
     */
    fun close() {
        try {
            zipFile.close()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to close ZIP file", e)
        }
    }
}

/**
 * Natural order comparator for proper file sorting (1, 2, 10 instead of 1, 10, 2)
 */
private fun naturalOrder(): Comparator<String> {
    return Comparator { str1, str2 ->
        val regex = Regex("(\\d+)|(\\D+)")
        val tokens1 = regex.findAll(str1).map { it.value }.toList()
        val tokens2 = regex.findAll(str2).map { it.value }.toList()

        for (i in 0 until minOf(tokens1.size, tokens2.size)) {
            val token1 = tokens1[i]
            val token2 = tokens2[i]

            val num1 = token1.toIntOrNull()
            val num2 = token2.toIntOrNull()

            val comparison = when {
                num1 != null && num2 != null -> num1.compareTo(num2)
                else -> token1.compareTo(token2, ignoreCase = true)
            }

            if (comparison != 0) return@Comparator comparison
        }

        tokens1.size.compareTo(tokens2.size)
    }
}
