import React, { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import ServerOwnerRouteWrapper from '@/components/ServerOwnerRouteWrapper.tsx'

const BookSearchScene = lazy(() => import('../bookSearch/BookSearchScene.tsx'))
const BookOverviewScene = lazy(() => import('./BookOverviewScene.tsx'))
const BookReaderScene = lazy(() => import('./reader/BookReaderScene.tsx'))
const EpubReaderScene = lazy(() => import('./reader/EpubReaderScene.tsx'))
const PDFReaderScene = lazy(() => import('./reader/PDFReaderScene.tsx'))
const BookManagementScene = lazy(() => import('./settings/BookManagementScene.tsx'))

export default function BookRouter() {
	return (
		<Routes>
			<Route path="/" element={<BookSearchScene />} />
			<Route path=":id" element={<BookOverviewScene />} />
			<Route path=":id/manage" element={<ServerOwnerRouteWrapper />}>
				<Route path="" element={<BookManagementScene />} />
			</Route>
			<Route path=":id/epub-reader" element={<EpubReaderScene />} />
			<Route path=":id/pdf-reader" element={<PDFReaderScene />} />
			<Route path=":id/reader" element={<BookReaderScene />} />
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
