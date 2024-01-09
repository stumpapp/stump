import { useSmartListWithMetaQuery, useUpdateSmartListMutation } from '@stump/client'
import { SmartList, SmartListView } from '@stump/types'
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router'

import { defaultWorkingView, SmartListContext, WorkingView } from './context'
import UserSmartListHeader from './UserSmartListHeader'
import UserSmartListNavigation from './UserSmartListNavigation'

export default function UserSmartListLayout() {
	const { id } = useParams<{ id: string }>()

	// TODO: I don't think I need both TBH, esp with how many more features I can add to the table...
	const [layout, setLayout] = React.useState<'table' | 'list'>(() => getDefaultLayout())
	const [selectedView, setSelectedView] = useState<SmartListView>()
	const [workingView, setWorkingView] = useState<WorkingView>()

	useEffect(() => {
		localStorage.setItem(LAYOUT_PREFERENCE_KEY, layout)
	}, [layout])

	/**
	 * An effect to update the working view whenever the selected view changes
	 */
	useEffect(() => {
		if (selectedView) {
			setWorkingView(selectedView)
		}
	}, [selectedView])

	/**
	 * Whether or not the working view is different from the selected view. If there is
	 * no selected view, then this will always be false
	 */
	const workingViewIsDifferent = useMemo(() => {
		if (!selectedView || !workingView) {
			return false
		}

		return (
			selectedView.book_columns !== workingView.book_columns ||
			selectedView.search !== workingView.search ||
			selectedView.book_sorting !== workingView.book_sorting ||
			selectedView.group_columns !== workingView.group_columns ||
			selectedView.group_sorting !== workingView.group_sorting
		)
	}, [selectedView, workingView])

	if (!id) {
		throw new Error('This scene requires an ID in the URL')
	}

	const {
		list,
		meta,
		listQuery: { isLoading: isLoadingList },
	} = useSmartListWithMetaQuery({ id })
	const { updateAsync } = useUpdateSmartListMutation({ id })

	const patchSmartList = useCallback(
		async (updates: Partial<SmartList>) => {
			if (list) {
				await updateAsync({ ...list, ...updates })
			}
		},
		[list, updateAsync],
	)

	/**
	 * A function to update the local working view state without storing it in the DB
	 */
	const updateWorkingView = useCallback((updates: Partial<WorkingView>) => {
		setWorkingView((workingView) => {
			const tentative = {
				...(workingView ?? defaultWorkingView),
				...updates,
			}

			const isDefault = Object.keys(tentative).every((key) => {
				const tentativeValue = tentative[key as keyof WorkingView]
				const defaultValue = defaultWorkingView[key as keyof WorkingView]

				return (!tentativeValue && !defaultValue) || tentativeValue === defaultValue
			})

			return isDefault ? undefined : tentative
		})
	}, [])

	/**
	 * A function to store the current working view as a new, stored view in the DB
	 */
	const saveWorkingView = useCallback(
		(name: string) => {
			if (!workingView || !list?.id) {
				return
			}

			// TODO: API call!
			setSelectedView({
				list_id: list.id,
				name,
				...workingView,
			})
		},
		[workingView, list?.id],
	)

	/**
	 * A function to update the currently selected stored view with the current working view changes
	 */
	const updateSelectedStoredView = useCallback(() => {
		if (!selectedView) {
			return
		}

		// TODO: API call!
		setSelectedView({
			...selectedView,
			...workingView,
		})
	}, [selectedView, workingView])

	if (isLoadingList) {
		return null
	}

	// TODO: redirect for these?
	if (!list) {
		throw new Error('The requested smart list does not exist!')
	}

	return (
		<SmartListContext.Provider
			value={{
				layout,
				list,
				meta,
				patchSmartList,
				saveWorkingView,
				selectStoredView: setSelectedView,
				selectedView,
				setLayout,
				updateSelectedStoredView,
				updateWorkingView,
				workingView,
				workingViewIsDifferent,
			}}
		>
			<UserSmartListHeader />
			<UserSmartListNavigation />
			<Suspense fallback={null}>
				<Outlet />
			</Suspense>
		</SmartListContext.Provider>
	)
}

const LAYOUT_PREFERENCE_KEY = 'smart-list-layout'

const isLayoutPreference = (value: string): value is 'table' | 'list' =>
	value === 'table' || value === 'list'
const getDefaultLayout = () => {
	const storedLayout = localStorage.getItem(LAYOUT_PREFERENCE_KEY)
	if (storedLayout && isLayoutPreference(storedLayout)) {
		return storedLayout
	}

	return 'table'
}
