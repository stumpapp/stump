import { ButtonOrLink } from '@stump/components'
import { Media } from '@stump/types'

import paths from '../../paths'

type Props = {
	book?: Media
}
export default function BookReaderLink({ book }: Props) {
	if (!book) {
		return null
	}

	const currentPage = book.current_page || -1

	const getTitle = () => {
		if (book.is_completed || currentPage === book.pages) {
			return 'Read again'
		} else if (currentPage > -1 || !!book.current_epubcfi) {
			return 'Continue reading'
		} else {
			return 'Start reading'
		}
	}

	const getHref = () => {
		if (book.current_epubcfi) {
			return paths.bookReader(book.id, {
				epubcfi: book.current_epubcfi,
				isEpub: true,
			})
		} else {
			return paths.bookReader(book?.id || '', { page: book?.current_page || 1 })
		}
	}

	const title = getTitle()

	return (
		<div className="flex w-full md:w-auto">
			<ButtonOrLink variant="primary" href={getHref()} title={title} className="w-full md:w-auto">
				{title}
			</ButtonOrLink>
		</div>
	)
}
