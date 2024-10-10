import { useUpdateSmartList } from '@stump/client'
import { CreateOrUpdateSmartList } from '@stump/sdk'
import React, { Suspense, useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useSmartListContext } from '../context'
import { SmartListSettingsContext } from './context'

const BasicSettingsScene = React.lazy(() => import('./basics'))
const AccessSettingsScene = React.lazy(() => import('./access'))
const FiltersSettingsScene = React.lazy(() => import('./filters'))
const DangerSettingsScene = React.lazy(() => import('./danger'))

export default function SmartListSettingsRouter() {
	const { list } = useSmartListContext()
	const { update } = useUpdateSmartList({ id: list.id })

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. yknow, literally
	// implement a patch endpoint lol. I'm being very lazy but I'll get to it. I'm tired!
	/**
	 * A pseudo-patch function which will update the list, mixing what is present in the cache
	 * with the updates provided.
	 */
	const patch = useCallback(
		(updates: Partial<CreateOrUpdateSmartList>) => {
			const payload: CreateOrUpdateSmartList = {
				...list,
				...updates,
			}
			update(payload)
		},
		[update, list],
	)

	return (
		<SmartListSettingsContext.Provider value={{ patch }}>
			<Suspense>
				<Routes>
					<Route path="" element={<Navigate to="basics" replace />} />
					<Route path="basics" element={<BasicSettingsScene />} />
					<Route path="access" element={<AccessSettingsScene />} />
					<Route path="filters" element={<FiltersSettingsScene />} />
					<Route path="delete" element={<DangerSettingsScene />} />
				</Routes>
			</Suspense>
		</SmartListSettingsContext.Provider>
	)
}
