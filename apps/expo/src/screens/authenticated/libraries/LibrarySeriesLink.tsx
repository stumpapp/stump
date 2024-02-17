import { Series } from '@stump/types'

import { Link } from '@/components'

type Props = {
	series: Series
}

export default function LibrarySeriesLink({ series }: Props) {
	return (
		<Link
			to={{ params: { id: series.id }, screen: 'SeriesBooks' }}
			className="max-w-full p-3 text-left"
		>
			{series.name}
		</Link>
	)
}
