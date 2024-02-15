import { Link } from '@react-navigation/native'
import { Library } from '@stump/types'

type Props = {
	library: Library
}

export default function LibraryListLink({ library }: Props) {
	return (
		<Link
			to={{ params: { id: library.id }, screen: 'LibrarySeries' }}
			className="w-full p-3 text-left"
		>
			{library.name}
		</Link>
	)
}
