import { ButtonOrLink } from '@stump/components'
import { Media } from '@stump/types'
import { useMemo } from 'react'

import paths from '../../paths'
import { EBOOK_EXTENSION } from '../../utils/patterns'

type Props = {
	book?: Media
}

export default function BookReaderLink({ book }: Props) {
	const currentPage = book?.current_page ?? -1

	/**
	 * A boolean used to control the redering of the 'Read again' prompt. A book
	 * is considered to be read again if:
	 *
	 * - It has been completed AND the current page is the last page
	 * - It has been completed AND is an epub AND there is no current epubcfi
	 */
	const isReadAgain = useMemo(() => {
		if (!book) return false

		return isReadAgainPrompt(book)
	}, [book])

	const epubcfi = book?.current_epubcfi
	const title = useMemo(() => {
		if (isReadAgain) {
			return 'Read again'
		} else if (currentPage > -1 || !!epubcfi) {
			return 'Continue reading'
		} else {
			return 'Start reading'
		}
	}, [isReadAgain, currentPage, epubcfi])

	/**
	 * The URL to use for the read link. If the book is an epub, the epubcfi is used
	 * to open the book at the correct location. Otherwise, the page number is used.
	 *
	 * If the book is completed, the read link will omit the epubcfi or page number
	 */
	const readUrl = useMemo(() => {
		if (!book) return undefined

		const { current_epubcfi, extension, id, current_page } = book

		if (current_epubcfi || extension.match(EBOOK_EXTENSION)) {
			return paths.bookReader(id, {
				epubcfi: isReadAgain ? undefined : current_epubcfi,
				isEpub: true,
			})
		} else {
			return paths.bookReader(id, { page: isReadAgain ? undefined : current_page || 1 })
		}
	}, [book, isReadAgain])

	if (!book) {
		return null
	}

	return (
		<div className="flex w-full md:w-auto">
			<ButtonOrLink variant="primary" href={readUrl} title={title} className="w-full md:w-auto">
				{title}
			</ButtonOrLink>
		</div>
	)
}

export const isReadAgainPrompt = (book: Media) => {
	const { is_completed, current_page, pages, current_epubcfi, extension } = book

	const isEpub = extension.match(EBOOK_EXTENSION)
	const epubCompleted = isEpub && !current_epubcfi && is_completed
	const otherCompleted = !isEpub && current_page === pages && is_completed

	return epubCompleted || otherCompleted
}
