import React, { lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router'

import { UnderConstruction } from '@/components/unimplemented'

import { useAppContext } from '../../context.ts'
import BookClubHomeLayout from './BookClubLayout.tsx'

const CreateBookClubScene = lazy(() => import('./createClub'))
const UserBookClubsScene = lazy(() => import('./UserBookClubsScene.tsx'))
const BookClubExplorerScene = lazy(() => import('./explore/BookClubExploreScene.tsx'))

// club-specific routes
const BookClubHomeScene = lazy(() => import('./tabs/home'))
const BookClubSettingsScene = lazy(() => import('./tabs/settings'))
const BookClubChatBoardScene = lazy(() => import('./tabs/chatBoard'))
const BookClubMembersScene = lazy(() => import('./tabs/members'))
const BookClubSchedulerScene = lazy(() => import('./tabs/settings/scheduler'))

const IS_DEVELOPMENT = import.meta.env.DEV

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

	if (!IS_DEVELOPMENT) {
		return (
			<Routes>
				<Route path="*" element={<UnderConstruction issue={120} />} />
			</Routes>
		)
	}

	return (
		<Routes>
			<Route path="" element={<UserBookClubsScene />} />
			<Route path="explore" element={<BookClubExplorerScene />} />
			{/* TODO: router guard bookclub:create */}
			<Route path="create" element={<CreateBookClubScene />} />
			<Route path=":id/*" element={<BookClubHomeLayout />}>
				<Route path="" element={<BookClubHomeScene />} />
				<Route path="home" element={<Navigate to=".." replace />} />
				<Route path="chat-board" element={<BookClubChatBoardScene />} />
				<Route path="members" element={<BookClubMembersScene />} />
				{/* TODO: settings router */}
				<Route path="settings" element={<BookClubSettingsScene />} />
				<Route path="settings/scheduler" element={<BookClubSchedulerScene />} />
			</Route>
			<Route path="*" element={<Navigate to="/404" />} />
		</Routes>
	)
}
