import { Link } from '@react-navigation/native'
import { Series } from '@stump/types'

type Props = {
	series: Series
}

export default function LibrarySeriesLink({ series }: Props) {
	return (
		<Link
			to={{ params: { id: series.id }, screen: 'SeriesBooks' }}
			className="w-full p-3 text-left"
		>
			{series.name}
		</Link>
	)
}
