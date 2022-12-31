import { useEpub } from '@stump/client'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import EpubReader from '../../components/readers/EpubReader'
import LazyEpubReader from '../../components/readers/LazyEpubReader'

export default function ReadEpub() {
	const [search] = useSearchParams()
	const loc = search.get('loc')
	const lazyReader = search.get('stream') && search.get('stream') !== 'true'

	const { id } = useParams()
	if (!id) {
		throw new Error('Media id is required')
	}

	const { isFetchingBook, epub, ...rest } = useEpub(id, { loc }, !lazyReader)

	if (lazyReader) {
		// TODO: remove the loc from search..
		return <LazyEpubReader id={id} loc={loc} />
	}

	if (isFetchingBook) {
		return <div>Loading...</div>
	}

	if (!epub) {
		throw new Error('Epub not found')
	}

	if (!epub.media_entity.extension.match(/epub/)) {
		return <Navigate to={`/books/${id}/pages/${epub.media_entity.current_page ?? 1}`} />
	}

	// else if (!loc) {
	// 	return <Navigate to={`/books/${id}/pages/1`} />;
	// }

	return <EpubReader isFetchingBook={isFetchingBook} epub={epub} {...rest} />
}
