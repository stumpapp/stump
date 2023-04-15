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

	const title = `${book.current_page ? 'Continue' : 'Start'} reading`

	return (
		<div className="flex w-full md:w-auto">
			<ButtonOrLink
				variant="primary"
				href={paths.bookReader(book?.id || '', { page: book?.current_page || 1 })}
				title={title}
				className="w-full md:w-auto"
			>
				{title}
			</ButtonOrLink>
		</div>
	)
}
