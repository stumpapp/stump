import { useLibraryByID } from '@stump/client'
import { Link } from '@stump/components'
import { Suspense } from 'react'

import paths from '../../paths'

type Props = {
	id: string
}
export default function SeriesLibraryLink({ id }: Props) {
	const { library } = useLibraryByID(id)

	return (
		<Suspense>
			{library && (
				<Link to={paths.librarySeries(library?.id || '')} className="line-clamp-1">
					{library?.name}
				</Link>
			)}
		</Suspense>
	)
}
