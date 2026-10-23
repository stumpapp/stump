import { UserPermission } from '@stump/graphql'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import UserPermissionRouteGuard from '@/components/UserPermissionRouteGuard.tsx'

const BookSearchScene = lazy(() => import('../bookSearch/BookSearchScene.tsx'))
const BookOverviewScene = lazy(() => import('./BookOverviewScene.tsx'))
const BookReaderScene = lazy(() => import('./reader/BookReaderScene.tsx'))
const EpubReaderScene = lazy(() => import('./reader/EpubReaderScene.tsx'))
const PDFReaderScene = lazy(() => import('./reader/PDFReaderScene.tsx'))
const BookManagementScene = lazy(() => import('./settings/BookManagementScene.tsx'))

// TODO(ui): conform to the pattern ive been leaning on:
// - tab nav in page header
//    - details
//    - metadata
//    - reading timeline (wordy for this)
// - not sure if settings needed really
// - breadcrumbs? the current pattern ive been doing is:
//    - breadcrumbs for settings pages
//    - bigger header for entities (e.g., library name, etc) + stats
//   but book names can be longer, so unsure?

export default function BookRouter() {
	return (
		<Suspense>
			<Routes>
				<Route path="/" element={<BookSearchScene />} />
				<Route path=":id" element={<BookOverviewScene />} />
				<Route
					path=":id/manage"
					element={
						<UserPermissionRouteGuard
							permissions={[
								UserPermission.ManageLibrary,
								UserPermission.EditThumbnails,
								UserPermission.EditMetadata,
							]}
							enforceAll={false}
						/>
					}
				>
					<Route path="" element={<BookManagementScene />} />
				</Route>
				<Route path=":id/epub-reader" element={<EpubReaderScene />} />
				<Route path=":id/pdf-reader" element={<PDFReaderScene />} />
				<Route path=":id/reader" element={<BookReaderScene />} />
				<Route path="*" element={<Navigate to="/404" />} />
			</Routes>
		</Suspense>
	)
}
