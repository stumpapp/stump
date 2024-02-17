import { Media } from '@stump/types'

import { Link } from '@/components'

type Props = {
	books: Media
}

export default function SeriesBookLink({ books }: Props) {
	return (
		<Link
			to={{ params: { id: books.id }, screen: 'BookStack' }}
			className="max-w-full p-3 text-left"
		>
			{books.name}
		</Link>
	)
}
