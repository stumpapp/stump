import React from 'react'
import { Helmet } from 'react-helmet'
import { useMediaMatch } from 'rooks'

import { FilterProvider } from '@/components/filters'
import BookSearch from '@/components/media/BookSearch'
import SceneContainer from '@/components/SceneContainer'
import { usePageParam } from '@/hooks/usePageParam'

export default function BookSearchScene() {
	const { page, setPage } = usePageParam()

	const is3XLScreenOrBigger = useMediaMatch('(min-width: 1600px)')

	return (
		<FilterProvider>
			<SceneContainer>
				<Helmet>
					<title>Stump | Books</title>
				</Helmet>

				<BookSearch
					page={page}
					page_size={is3XLScreenOrBigger ? 40 : 20}
					setPage={setPage}
					showFilters
				/>
			</SceneContainer>
		</FilterProvider>
	)
}
