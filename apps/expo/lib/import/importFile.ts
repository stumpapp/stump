import { File } from 'expo-file-system'

import { DownloadRepository } from '~/db/downloads'
import { booksDirectory, toAbsolutePath } from '~/lib/filesystem'
import { getContentUriDisplayName } from '~/modules/contentUriInfo'
import {
	generateLocalBookId,
	ImportableExtension,
	LOCAL_LIBRARY_SERVER_ID,
	resolveImportableExtension,
} from '~/lib/localLibrary'

export type ImportResult =
	| {
			success: true
			bookId: string
			filename: string
	  }
	| {
			success: false
			error: string
	  }

/**
 * Import a file from an external URI (content://, file://) into the local library
 */
export async function importLocalFile(
	externalUri: string,
	originalFilename?: string,
): Promise<ImportResult> {
	try {
		const sourceFile = new File(externalUri)
		const fallbackFilename =
			originalFilename ||
			(await getContentUriDisplayName(externalUri)) ||
			extractFilename(externalUri)

		let mimeType: string | undefined
		try {
			mimeType = sourceFile.type || undefined
		} catch {
			mimeType = undefined
		}

		const extension = resolveImportableExtension(mimeType, fallbackFilename)
		if (!extension) {
			return {
				success: false,
				error: `Unsupported file type: ${fallbackFilename}${mimeType ? ` (${mimeType})` : ''}. Supported formats: EPUB, CBZ, PDF`,
			}
		}

		const bookId = generateLocalBookId()
		const storedFilename = `${bookId}.${extension}`

		const booksDir = booksDirectory(LOCAL_LIBRARY_SERVER_ID)

		const destinationUri = `${booksDir}/${storedFilename}`

		const bytes = await sourceFile.bytes()
		const destFile = new File(destinationUri)
		destFile.create({ intermediates: true })
		destFile.write(bytes)

		const fileInfo = destFile.info()
		const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined

		await DownloadRepository.addFile({
			id: bookId,
			filename: storedFilename,
			uri: toAbsolutePath(destinationUri),
			serverId: LOCAL_LIBRARY_SERVER_ID,
			size: fileSize,
			bookName: extractBookName(fallbackFilename, extension),
			// TODO: Metadata? idk, kinda would be like reimplementing stump core which sucks
			metadata: null,
		})

		return {
			success: true,
			bookId,
			filename: storedFilename,
		}
	} catch (error) {
		console.error('[importLocalFile] Failed to import file:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during import',
		}
	}
}

function extractFilename(uri: string): string {
	const cleanUri = uri.split('?')[0]?.split('#')[0] ?? uri

	const decoded = decodeURIComponent(cleanUri)

	const segments = decoded.split('/')
	const lastSegment = segments[segments.length - 1]

	return lastSegment || `imported_${Date.now()}.epub`
}

function extractBookName(filename: string, extension: ImportableExtension): string {
	const cleaned = filename
		.replace(/\.(epub|cbz|pdf|zip)$/i, '')
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	// content:// URIs with no recoverable display name fall back to an opaque
	// last path segment (often a bare numeric ID), which makes a poor book title.
	const isOpaque = !cleaned || /^\d+$/.test(cleaned)

	return isOpaque ? `Imported ${extension.toUpperCase()}` : cleaned
}
