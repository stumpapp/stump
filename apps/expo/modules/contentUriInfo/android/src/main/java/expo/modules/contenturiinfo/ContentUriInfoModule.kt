package expo.modules.contenturiinfo

import android.net.Uri
import android.provider.OpenableColumns
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ContentUriInfoModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ContentUriInfo")

        AsyncFunction("getDisplayName") { uriString: String ->
            val contentResolver = appContext.reactContext?.contentResolver
            if (contentResolver == null) {
                null
            } else {
                runCatching {
                    contentResolver.query(Uri.parse(uriString), arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (index >= 0 && cursor.moveToFirst()) {
                            cursor.getString(index)
                        } else {
                            null
                        }
                    }
                }.getOrNull()
            }
        }
    }
}
