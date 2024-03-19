import { RouteProp, useRoute } from '@react-navigation/native'
import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION, useMediaByIdQuery } from '@stump/client'
import React from 'react'

import { EpubJSReader, ImageBasedReader, UnsupportedReader } from '@/components/reader'

type Params = {
	params: {
		id: string
		restart?: boolean
		incognito?: boolean
	}
}

/**
 * A sort of weigh station that renders the corresponding reader for a given media
 */
export default function BookReaderScreen() {
	const {
		params: { id, restart, incognito },
	} = useRoute<RouteProp<Params>>()

	const { isLoading: fetchingBook, media: book } = useMediaByIdQuery(id)

	if (fetchingBook) {
		return null
	}

	if (book.extension.match(EBOOK_EXTENSION)) {
		const currentProgressCfi = book.current_epubcfi || undefined
		const initialCfi = restart ? undefined : currentProgressCfi
		return <EpubJSReader book={book} initialCfi={initialCfi} incognito={incognito} />
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		const currentProgressPage = book.current_page || 1
		const initialPage = restart ? 1 : currentProgressPage
		return <ImageBasedReader book={book} initialPage={initialPage} incognito={incognito} />
	}

	// TODO: support native PDF reader?
	// else if (book.extension.match(PDF_EXTENSION)) {}

	return <UnsupportedReader />
}
