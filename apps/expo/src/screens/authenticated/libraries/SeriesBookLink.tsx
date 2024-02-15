import { Link } from '@react-navigation/native'
import { Media } from '@stump/types'

type Props = {
	books: Media
}

export default function SeriesBookLink({ books }: Props) {
	return (
		<Link to={{ params: { id: books.id }, screen: 'BookStack' }} className="w-full p-3 text-left">
			{books.name}
		</Link>
	)
}
