import { graphql } from '@stump/graphql'
import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import EpubJsReader from '@/components/readers/epub/EpubJsReader'

import paths from '../../../paths'

//! NOTE: Only the epub.js reader is supported for now :sob:
export default function EpubReaderScene() {
	const { id } = useParams()
	if (!id) {
		throw new Error('Media id is required')
	}

	const [search, setSearch] = useSearchParams()

	const [initialCfi] = useState(() => decodeURIComponent(search.get('cfi') || ''))
	const [startOver] = useState(() => search.get('startOver') === 'true')

	const lazyReader = search.get('stream') && search.get('stream') !== 'true'
	const isIncognito = search.get('incognito') === 'true'

	/**
	 * An effect to remove the CFI from the URL, it will be stored in local state
	 * so it doesn't need to pollute the URL
	 */
	useEffect(() => {
		if (initialCfi || startOver) {
			search.delete('cfi')
			search.delete('startOver')
			setSearch(search)
		}
	}, [initialCfi, startOver, search, setSearch])

	if (lazyReader) {
		return <EpubJsReader id={id} isIncognito={isIncognito} />
	} else {
		search.set('stream', 'true')
		setSearch(search)
		return <Navigate to={paths.bookReader(id, { isEpub: true })} />
	}
}
