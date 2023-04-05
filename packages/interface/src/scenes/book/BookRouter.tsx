import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const BookOverviewScene = lazily(() => import('./BookOverviewScene'))
const BookReaderScene = lazily(() => import('./BookReaderScene'))
const EpubReaderScene = lazily(() => import('./epub/EpubReaderScene'))

export default function BookRouter() {
	return (
		<Routes>
			<Route path=":id" element={<BookOverviewScene />} />
			<Route path=":id/epub-reader" element={<EpubReaderScene />} />
			<Route path=":id/page/:page" element={<BookReaderScene />} />
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
