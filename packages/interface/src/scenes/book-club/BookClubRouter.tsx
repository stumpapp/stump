import { useUserStore } from '@stump/client'
import React from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { LazyComponent } from '../../AppRouter'
import BookClubHomeLayout from './home/BookClubHomeLayout.tsx'

const lazily = (loader: () => unknown) => React.lazy(() => loader() as LazyComponent)

const BookClubExplorerScene = lazily(() => import('./explore/BookClubExploreScene.tsx'))
const BookClubOverviewScene = lazily(() => import('./home/tabs/overview/BookClubOverviewScene.tsx'))
const UserBookClubsScene = lazily(() => import('./UserBookClubsScene.tsx'))
const CreateBookClubScene = lazily(() => import('./create-club/CreateBookClubScene.tsx'))
const BookClubSettingsScene = lazily(() => import('./home/tabs/settings/BookClubSettingsScene.tsx'))
const BookClubChatBoardScene = lazily(
	() => import('./home/tabs/chat-board/BookClubChatBoardScene.tsx'),
)
const BookClubMembersScene = lazily(() => import('./home/tabs/members/BookClubMembersScene.tsx'))

export default function BookClubRouter() {
	const checkUserPermission = useUserStore((store) => store.checkUserPermission)

	const userCanAccess = checkUserPermission('bookclub:read')

	if (!userCanAccess) {
		return <Navigate to=".." />
	}

	return (
		<Routes>
			<Route path="" element={<UserBookClubsScene />} />
			<Route path="explore" element={<BookClubExplorerScene />} />
			{/* TODO: router guard bookclub:create */}
			<Route path="create" element={<CreateBookClubScene />} />
			<Route path=":id/*" element={<BookClubHomeLayout />}>
				<Route path="" element={<Navigate to="overview" replace />} />
				<Route path="overview" element={<BookClubOverviewScene />} />
				<Route path="chat-board" element={<BookClubChatBoardScene />} />
				<Route path="members" element={<BookClubMembersScene />} />
				<Route path="settings" element={<BookClubSettingsScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
