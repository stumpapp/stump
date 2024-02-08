import React, { lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { useAppContext } from '../../context.ts'
import BookClubHomeLayout from './home/BookClubHomeLayout.tsx'

const BookClubExplorerScene = lazy(() => import('./explore/BookClubExploreScene.tsx'))
const BookClubOverviewScene = lazy(() => import('./home/tabs/overview/BookClubOverviewScene.tsx'))
const UserBookClubsScene = lazy(() => import('./UserBookClubsScene.tsx'))
const CreateBookClubScene = lazy(() => import('./create-club/CreateBookClubScene.tsx'))
const BookClubSettingsScene = lazy(() => import('./home/tabs/settings/BookClubSettingsScene.tsx'))
const BookClubChatBoardScene = lazy(
	() => import('./home/tabs/chat-board/BookClubChatBoardScene.tsx'),
)
const BookClubMembersScene = lazy(() => import('./home/tabs/members/BookClubMembersScene.tsx'))
const BookClubSchedulerScene = lazy(
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
