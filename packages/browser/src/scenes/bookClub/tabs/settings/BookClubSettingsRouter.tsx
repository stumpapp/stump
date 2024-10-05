import { useUpdateBookClub } from '@stump/client'
import { UpdateBookClub } from '@stump/types'
import React, { Suspense, useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useBookClubContext } from '@/components/bookClub'

import { BookClubManagementContext } from './context'

const BasicSettingsScene = React.lazy(() => import('./basics'))
const MemberManagementScene = React.lazy(() => import('./members'))
const DeletionScene = React.lazy(() => import('./danger'))
const BookClubSchedulerScene = React.lazy(() => import('./scheduler'))

export default function BookClubSettingsRouter() {
	const { bookClub } = useBookClubContext()

	const { mutate: editClub } = useUpdateBookClub({ id: bookClub.id })

	// TODO: implement a proper patch on backend
	/**
	 * A pseudo-patch function which will update the book club, mixing what is present in the cache
	 * with the updates provided.
	 */
	const patch = useCallback(
		(updates: Partial<UpdateBookClub>) => {
			const payload: UpdateBookClub = {
				...bookClub,
				...updates,
			}
			editClub(payload)
		},
		[editClub, bookClub],
	)

	return (
		<Suspense>
			<BookClubManagementContext.Provider value={{ patch }}>
				<Routes>
					<Route path="" element={<Navigate to="basics" replace />} />
					<Route path="basics" element={<BasicSettingsScene />} />
					<Route path="members" element={<MemberManagementScene />} />
					<Route path="scheduler" element={<BookClubSchedulerScene />} />
					<Route path="delete" element={<DeletionScene />} />
				</Routes>
			</BookClubManagementContext.Provider>
		</Suspense>
	)
}
