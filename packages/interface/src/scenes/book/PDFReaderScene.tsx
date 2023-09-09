import { useParams } from 'react-router'

import NativePDFViewer from '../../components/readers/pdf/NativePDFViewer'

export default function PDFReaderScene() {
	const { id } = useParams()

	if (!id) {
		throw new Error('Media id is required')
	}

	return <NativePDFViewer id={id} />
}
