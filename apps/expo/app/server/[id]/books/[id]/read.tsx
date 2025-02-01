import { ARCHIVE_EXTENSION, EBOOK_EXTENSION, PDF_EXTENSION, useMediaByIdQuery } from '@stump/client'
import { useLocalSearchParams } from 'expo-router'
import { View } from 'react-native'
import {
	EpubJSReader,
	ImageBasedReader,
	UnsupportedReader,
} from '~/components/activeServer/book/reader'
import { Text } from '~/components/ui'

type Params = {
	id: string
	// restart?: boolean
	// incognito?: boolean
}

export default function Screen() {
	const { id: bookID } = useLocalSearchParams<Params>()
	// const {
	//   activeServer: { id },
	// } = useActiveServer()
	const { media: book } = useMediaByIdQuery(bookID, { suspense: true })

	if (!book) return null

	if (book.extension.match(EBOOK_EXTENSION)) {
		const currentProgressCfi = book.current_epubcfi || undefined
		// const initialCfi = restart ? undefined : currentProgressCfi
		return <EpubJSReader book={book} /*initialCfi={initialCfi} incognito={incognito}*/ />
	} else if (book.extension.match(ARCHIVE_EXTENSION) || book.extension.match(PDF_EXTENSION)) {
		const currentProgressPage = book.current_page || 1
		// const initialPage = restart ? 1 : currentProgressPage
		const initialPage = currentProgressPage
		return <ImageBasedReader book={book} initialPage={initialPage} /*incognito={incognito}*/ />
	}

	// TODO: support native PDF reader?
	// else if (book.extension.match(PDF_EXTENSION)) {}

	return <UnsupportedReader />
}
