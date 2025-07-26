import {
	AccessRole,
	SaveSmartListInput,
	SmartListGrouping,
	SmartListMeta,
	SmartListView,
} from '@stump/graphql'
import { createContext, useContext } from 'react'

import { SmartListParsed } from './graphql'
import { buildColumns as buildGroupColumns } from './items/table/groupColumns'
import { defaultColumns } from './items/table/mediaColumns'

export type WorkingView = Omit<SmartListView, 'id' | 'name' | 'listId'>
export const defaultWorkingView: WorkingView = {
	bookColumns: defaultColumns.map(({ id }, position) => ({ id: id || '', position })),
	bookSorting: [],
	groupColumns: [],
	groupSorting: [],
}
const buildDefaultWorkingView = (grouping?: SmartListGrouping): WorkingView => {
	if (!grouping || grouping === 'BY_BOOKS') {
		return defaultWorkingView
	} else {
		return {
			...defaultWorkingView,
			groupColumns: buildGroupColumns(grouping === 'BY_SERIES', []).map(({ id }, position) => ({
				id: id || '',
				position,
			})),
		}
	}
}

export type ISmartListContext = {
	list: SmartListParsed
	meta?: SmartListMeta

	workingView?: WorkingView
	updateWorkingView: (updates: Partial<WorkingView>) => void
	saveWorkingView: (name: string) => Promise<void>

	selectedView?: SmartListView
	selectStoredView: (view?: SmartListView) => void
	saveSelectedStoredView: (newName?: string) => Promise<void>

	patchSmartList: (updates: Partial<SaveSmartListInput>) => Promise<void>

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
		workingView,
		saveWorkingView,
		updateWorkingView,
		list: { defaultGrouping },
	} = useSmartListContext()

	const workingViewIsDefined = !!workingView

	return {
		saveWorkingView,
		updateWorkingView,
		workingView: workingView || buildDefaultWorkingView(defaultGrouping),
		workingViewIsDefined,
	}
}
