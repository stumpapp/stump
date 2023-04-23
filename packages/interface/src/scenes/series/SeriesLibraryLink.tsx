import { useLibraryByIdQuery } from '@stump/client'
import { Link } from '@stump/components'
import { Suspense } from 'react'

type Props = {
	id: string
}
export default function SeriesLibraryLink({ id }: Props) {
	const { library } = useLibraryByIdQuery(id)

	return (
		<Suspense>{library && <Link to={`/library/${library?.id}`}>{library?.name}</Link>}</Suspense>
	)
}
