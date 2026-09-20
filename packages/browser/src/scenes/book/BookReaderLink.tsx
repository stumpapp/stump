import { EBOOK_EXTENSION } from '@stump/client'
import { ButtonOrLink } from '@stump/components'
import { BookCardFragment } from '@stump/graphql'
import { useMemo } from 'react'

import { usePaths } from '@/paths'
import { isEbookReadProgress } from '@/utils/readingProgress'

type Props = {
	book: BookCardFragment
}

export default function BookReaderLink({ book }: Props) {
	const paths = usePaths()

	const isReadAgain = useMemo(() => isReadAgainPrompt(book), [book])

	const hasEbookProgress = isEbookReadProgress(book.readProgress, book.extension)
	const currentPage = book.readProgress?.page ?? -1
	const title = useMemo(() => {
		if (isReadAgain) {
			return 'Read again'
		} else if (currentPage > 0 || hasEbookProgress) {
			return 'Continue reading'
		} else {
			return 'Read'
		}
	}, [isReadAgain, currentPage, hasEbookProgress])

	const readUrl = useMemo(() => {
		const { id, readProgress, extension } = book

		if (extension.match(EBOOK_EXTENSION) || isEbookReadProgress(readProgress, extension)) {
			return paths.bookReader(id, {
				isEpub: true,
			})
		}

		const page = readProgress?.page
		return paths.bookReader(id, { page: isReadAgain ? 1 : page || 1 })
	}, [book, isReadAgain, paths])

	return (
		<ButtonOrLink className="w-full" href={readUrl} title={title}>
			{title}
		</ButtonOrLink>
	)
}

export const isReadAgainPrompt = (
	book: Pick<BookCardFragment, 'pages' | 'readProgress' | 'readHistory' | 'extension'>,
) => {
	const { readProgress, readHistory } = book

	const isHistoricallyCompleted = readHistory?.some((h) => h.completedAt) ?? false

	return isHistoricallyCompleted && !readProgress
}
