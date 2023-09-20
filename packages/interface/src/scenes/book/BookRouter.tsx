import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const BookSearchScene = lazily(() => import('./BookSearchScene.tsx'))
const BookOverviewScene = lazily(() => import('./BookOverviewScene.tsx'))
const BookReaderScene = lazily(() => import('./BookReaderScene.tsx'))
const EpubReaderScene = lazily(() => import('./EpubReaderScene.tsx'))
const PDFReaderScene = lazily(() => import('./PDFReaderScene.tsx'))

export default function BookRouter() {
	return (
		<Routes>
			<Route path="/" element={<BookSearchScene />} />
			<Route path=":id" element={<BookOverviewScene />} />
			<Route path=":id/epub-reader" element={<EpubReaderScene />} />
			<Route path=":id/pdf-reader" element={<PDFReaderScene />} />
			<Route path=":id/reader" element={<BookReaderScene />} />
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
