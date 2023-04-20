import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import EpubJsReader from '../../../components/readers/epub/EpubJsReader'
import paths from '../../../paths'

//! NOTE: Only the epub.js reader is supported for now :sob:
export default function EpubReaderScene() {
	const [search, setSearch] = useSearchParams()
	const initialCfi = decodeURIComponent(search.get('cfi') || '')
	const lazyReader = search.get('stream') && search.get('stream') !== 'true'

	const { id } = useParams()
	if (!id) {
		throw new Error('Media id is required')
	}

	if (lazyReader) {
		return <EpubJsReader id={id} initialCfi={initialCfi} />
	} else {
		search.set('stream', 'true')
		setSearch(search)
		return <Navigate to={paths.bookReader(id, { isEpub: true })} />
	}
}
