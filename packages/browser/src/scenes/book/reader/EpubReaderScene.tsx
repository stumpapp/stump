import { useSDK } from '@stump/client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { ReadiumWebReader } from '@/components/readers/epub/readium'

/**
 * EPUB reader scene — Readium streaming is the production reader.
 * Legacy epub.js remains in-tree for now.
 */
export default function EpubReaderScene() {
	const { sdk } = useSDK()
	const { id } = useParams()

	if (!id) {
		throw new Error('Media id is required')
	}

	const [search] = useSearchParams()
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

	return <ReadiumWebReader id={id} isIncognito={isIncognito} />
}
