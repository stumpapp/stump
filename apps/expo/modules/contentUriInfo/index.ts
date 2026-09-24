import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'

interface NativeContentUriInfoModule {
	/**
	 * Resolves the OpenableColumns.DISPLAY_NAME for a content:// URI via
	 * Android's ContentResolver. Returns null if the URI has no resolvable
	 * display name or the query fails.
	 */
	getDisplayName(uri: string): Promise<string | null>
}

/**
 * Resolves the real display name for a `content://` URI via Android's
 * ContentResolver (OpenableColumns.DISPLAY_NAME). This exists because the
 * URI's path segments are frequently opaque (e.g. a numeric document ID from
 * Google Drive, Gmail, or the Downloads provider) and carry no relation to
 * the file's actual name, so naive path-parsing on the URI can't recover it.
 *
 * Returns null on iOS, for non-`content://` URIs, or if resolution fails.
 */
export async function getContentUriDisplayName(uri: string): Promise<string | null> {
	if (Platform.OS !== 'android' || !uri.startsWith('content://')) {
		return null
	}

	try {
		const ContentUriInfoModule = requireNativeModule<NativeContentUriInfoModule>('ContentUriInfo')
		return await ContentUriInfoModule.getDisplayName(uri)
	} catch {
		return null
	}
}
