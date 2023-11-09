import React from 'react'
import { Helmet } from 'react-helmet'

import { FilterProvider } from '../../components/filters'
import BookSearch from '../../components/media/BookSearch'
import SceneContainer from '../../components/SceneContainer'
import { usePageParam } from '../../hooks/usePageParam'

export default function BookSearchScene() {
	const { page, setPage } = usePageParam()

	return (
		<FilterProvider>
			<SceneContainer>
				<Helmet>
					<title>Stump | Books</title>
				</Helmet>

				<BookSearch page={page} setPage={setPage} showFilters />
			</SceneContainer>
		</FilterProvider>
	)
}
