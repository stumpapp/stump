import {
	AccessRole,
	SmartList,
	SmartListItemGrouping,
	SmartListMeta,
	SmartListView,
} from '@stump/types'
import { createContext, useContext } from 'react'

import { buildColumns as buildGroupColumns } from './items/table/groupColumns'
import { defaultColumns } from './items/table/mediaColumns'

export type WorkingView = Omit<SmartListView, 'name' | 'list_id'>
export const defaultWorkingView: WorkingView = {
	book_columns: defaultColumns.map(({ id }, position) => ({ id: id || '', position })),
	book_sorting: null,
	group_columns: [],
	group_sorting: null,
}
const buildDefaultWorkingView = (grouping?: SmartListItemGrouping): WorkingView => {
	if (!grouping || grouping === 'BY_BOOKS') {
		return defaultWorkingView
	} else {
		return {
			...defaultWorkingView,
			group_columns: buildGroupColumns(grouping === 'BY_SERIES', []).map(({ id }, position) => ({
				id: id || '',
				position,
			})),
		}
	}
}

export type ISmartListContext = {
	list: SmartList
	meta?: SmartListMeta

	workingView?: WorkingView
	workingViewIsDifferent: boolean
	updateWorkingView: (updates: Partial<WorkingView>) => void
	saveWorkingView: (name: string) => Promise<void>

	selectedView?: SmartListView
	selectStoredView: (view: SmartListView) => void
	saveSelectedStoredView: (newName?: string) => Promise<void>

	patchSmartList: (updates: Partial<SmartList>) => Promise<void>

	layout: 'table' | 'list'
	setLayout: (layout: 'table' | 'list') => void

	viewerRole: AccessRole
}

export const SmartListContext = createContext<ISmartListContext | null>(null)

export const useSmartListContext = () => {
	const context = useContext(SmartListContext)

	if (!context) {
		throw new Error('useSmartListContext must be used within a SmartListContextProvider')
	}

	return context
}

export const useSafeWorkingView = () => {
	const {
		workingViewIsDifferent,
		workingView,
		saveWorkingView,
		updateWorkingView,
		list: { default_grouping },
	} = useSmartListContext()

	const workingViewIsDefined = !!workingView

	return {
		saveWorkingView,
		updateWorkingView,
		workingView: workingView || buildDefaultWorkingView(default_grouping),
		workingViewIsDefined,
		workingViewIsDifferent,
	}
}
