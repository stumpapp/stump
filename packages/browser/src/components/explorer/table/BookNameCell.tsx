import { Link } from '@stump/components'
import { DirectoryListingFile } from '@stump/types'
import React, { useEffect, useState } from 'react'

import paths from '@/paths'

import { getBook } from '../FileThumbnail'

type Props = {
	file: DirectoryListingFile
}
export default function BookNameCell({ file }: Props) {
	const [id, setId] = useState<string>()

	useEffect(() => {
		getBook(file.path).then((book) => {
			setId(book?.id)
		})
	}, [file.path])

	return (
		<Link
			to={id ? paths.bookOverview(id) : ''}
			className="line-clamp-2 text-sm text-opacity-100 no-underline hover:text-opacity-90"
		>
			{file.name}
		</Link>
	)
}
