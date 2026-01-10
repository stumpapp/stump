import { useSDK } from '@stump/client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'

import EpubJsReader from '@/components/readers/epub/EpubJsReader'

import paths from '../../../paths'

//! NOTE: Only the epub.js reader is supported for now :sob:
export default function EpubReaderScene() {
	const { sdk } = useSDK()
	const { id } = useParams()

	if (!id) {
		throw new Error('Media id is required')
	}

	const [search, setSearch] = useSearchParams()

	const lazyReader = search.get('stream') && search.get('stream') !== 'true'
	const isIncognito = search.get('incognito') === 'true'

	const client = useQueryClient()
	useEffect(() => {
		return () => {
			client.invalidateQueries({
				exact: false,
				predicate: ({ queryKey: [root] }) => root === sdk.cacheKeys.bookReader,
			})
			client.invalidateQueries({ exact: false, queryKey: [sdk.cacheKeys.bookOverview] })
			client.invalidateQueries({ exact: false, queryKey: [sdk.cacheKeys.inProgress] })
		}
	}, [client, sdk.cacheKeys])

	if (lazyReader) {
		return <EpubJsReader id={id} isIncognito={isIncognito} />
	} else {
		search.set('stream', 'true')
		setSearch(search)
		return <Navigate to={paths.bookReader(id, { isEpub: true })} />
	}
}
