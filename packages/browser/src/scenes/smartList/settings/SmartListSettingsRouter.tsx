import { useUpdateSmartList } from '@stump/client'
import { CreateOrUpdateSmartList } from '@stump/sdk'
import { lazy, Suspense, useCallback } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { useSmartListContext } from '../context'
import { SmartListSettingsContext } from './context'

const BasicSettingsScene = lazy(() => import('./basics'))
const AccessSettingsScene = lazy(() => import('./access'))
const FiltersSettingsScene = lazy(() => import('./filters'))
const DangerSettingsScene = lazy(() => import('./danger'))

export default function SmartListSettingsRouter() {
	const { list } = useSmartListContext()
	const { update } = useUpdateSmartList({ id: list.id })

	// TODO: This is particularly fallible. It would be a lot wiser to eventually just.. y'know, literally
	// implement a patch endpoint lol. I'm being very lazy but I'll get to it. I'm tired!
	/**
	 * A pseudo-patch function which will update the list, mixing what is present in the cache
	 * with the updates provided.
	 * Note: It is important to remember the structure of the filters is vastly different from the structure
	 * of the payload, and so be careful when calling this function that you transform the filters if they are
	 * present
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
