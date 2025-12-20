import { Navigate } from 'react-router'

import { useLibraryContext } from './context'

/**
 * A component that redirects to the default view for a library based on its configuration.
 * If the library has a default_library_view_mode set to 'BOOKS', it redirects to the books tab.
 * Otherwise, it defaults to the series tab.
 */
export default function LibraryDefaultRedirect() {
	const { library } = useLibraryContext()
	const defaultViewMode = library.config.default_library_view_mode || 'SERIES'

	const redirectTo = defaultViewMode === 'BOOKS' ? 'books' : 'series'

	return <Navigate to={redirectTo} replace />
}
