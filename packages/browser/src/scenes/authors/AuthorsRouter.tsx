import { lazy } from 'react'
import { Route, Routes } from 'react-router'

const AuthorsScene = lazy(() => import('./AuthorsScene'))
const AuthorById = lazy(() => import('./AuthorById'))

export function AuthorsRouter() {
	return (
		<Routes>
			<Route path="" element={<AuthorsScene />} />
			<Route path=":id" element={<AuthorById />} />
		</Routes>
	)
}
