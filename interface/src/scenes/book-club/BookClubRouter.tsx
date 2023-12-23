import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { LazyComponent } from '../../AppRouter.tsx'
import { useAppContext } from '../../context.ts'
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
const BookClubSchedulerScene = lazily(
	() => import('./home/tabs/settings/scheduler/BookClubSchedulerScene.tsx'),
)

export default function BookClubRouter() {
	const { checkPermission } = useAppContext()

	const navigate = useNavigate()
	const canAccess = checkPermission('bookclub:read')
	useEffect(() => {
		if (!canAccess) {
			navigate('..')
		}
	}, [canAccess, navigate])

	if (!canAccess) {
		return null
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
				<Route path="settings/scheduler" element={<BookClubSchedulerScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
