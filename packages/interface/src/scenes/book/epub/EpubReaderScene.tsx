// import { useEpub } from '@stump/client'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

// import EpubReader from '../../../components/readers/EpubReader'
import LazyEpubReader from '../../../components/readers/LazyEpubReader'
import paths from '../../../paths'

export default function EpubReaderScene() {
	const [search, setSearch] = useSearchParams()
	const loc = search.get('loc')
	const lazyReader = search.get('stream') && search.get('stream') !== 'true'

	const { id } = useParams()
	if (!id) {
		throw new Error('Media id is required')
	}

	// const { isFetchingBook, epub, ...rest } = useEpub(id, { loc }, !lazyReader)
	if (lazyReader) {
		// FIXME: infinite loop
		// search.delete('loc')
		// setSearch(search)
		return <LazyEpubReader id={id} loc={loc} />
	} else {
		search.set('stream', 'true')
		setSearch(search)
		return <Navigate to={paths.bookReader(id, { isEpub: true })} />
	}

	// if (isFetchingBook) {
	// 	return <div>Loading...</div>
	// } else if (!epub) {
	// 	throw new Error('Epub not found')
	// }

	// if (!epub.media_entity.extension.match(/epub/)) {
	// 	return <Navigate to={paths.bookReader(id, { page: epub.media_entity.current_page ?? 1 })} />
	// }

	// return <EpubReader isFetchingBook={isFetchingBook} epub={epub} {...rest} />
}
