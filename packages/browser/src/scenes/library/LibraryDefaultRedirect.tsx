import { LibraryViewMode } from '@stump/graphql'
import { Navigate } from 'react-router'

import { useLibraryContext } from './context'

export default function LibraryDefaultRedirect() {
	const { library } = useLibraryContext()

	const hideSeriesView = library.config?.hideSeriesView ?? false
	const defaultViewMode = library.config?.defaultLibraryViewMode ?? LibraryViewMode.Series

	const defaultRoute =
		hideSeriesView || defaultViewMode === LibraryViewMode.Books ? 'books' : 'series'

	return <Navigate to={defaultRoute} replace />
}
