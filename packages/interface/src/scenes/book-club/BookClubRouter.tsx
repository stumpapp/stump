import { useUserStore } from '@stump/client'
import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const PublicBookClubExplorerScene = lazily(() => import('./PublicBookClubExplorerScene.tsx'))
const BookClubHomeScene = lazily(() => import('./BookClubHomeScene.tsx'))

export default function BookClubRouter() {
	const checkUserPermission = useUserStore((store) => store.checkUserPermission)

	const userCanAccess = checkUserPermission('bookclub:read')

	if (!userCanAccess) {
		return <Navigate to=".." />
	}

	return (
		<Routes>
			<Route path="explore" element={<PublicBookClubExplorerScene />} />
			<Route path=":id" element={<BookClubHomeScene />} />
			{/* <Route path=":id/manage" element={<BookClubManagementScene />} /> */}
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
