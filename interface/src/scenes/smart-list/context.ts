import { SmartList, SmartListMeta, SmartListView } from '@stump/types'
import { createContext, useContext } from 'react'

import { defaultColumns } from './items/table/mediaColumns'

export type WorkingView = Omit<SmartListView, 'name' | 'list_id'>
export const defaultWorkingView: WorkingView = {
	columns: defaultColumns.map(({ id }, position) => ({ id: id || '', position })),
	sorting: null,
}

export type ISmartListContext = {
	list: SmartList
	meta?: SmartListMeta

	workingView?: WorkingView
	workingViewIsDifferent: boolean
	updateWorkingView: (updates: Partial<WorkingView>) => void
	saveWorkingView: (name: string) => void

	selectedView?: SmartListView
	selectStoredView: (view: SmartListView) => void
	updateSelectedStoredView: (view: SmartListView) => void

	layout: 'table' | 'list'
	setLayout: (layout: 'table' | 'list') => void
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
	const { workingViewIsDifferent, workingView, saveWorkingView, updateWorkingView } =
		useSmartListContext()

	const workingViewIsDefined = !!workingView

	return {
		saveWorkingView,
		updateWorkingView,
		workingView: workingView || defaultWorkingView,
		workingViewIsDefined,
		workingViewIsDifferent,
	}
}
