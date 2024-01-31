import { useParams } from 'react-router'

import NativePDFViewer from '@/components/readers/pdf/NativePDFViewer'

/**
 * A scene for reading PDFs using the native PDF viewer in the browser.
 */
export default function PDFReaderScene() {
	const { id } = useParams()

	if (!id) {
		throw new Error('Media ID is required')
	}

	return <NativePDFViewer id={id} />
}
