import { SmartListGrouping, SmartListView } from '@stump/graphql'
import { createContext, useContext } from 'react'
import { create, useStore } from 'zustand'

import { buildColumns as buildGroupColumns } from './items/table/groupColumns'
import { defaultColumns } from './items/table/mediaColumns'

export type WorkingView = Omit<SmartListView, 'id' | 'name' | 'listId'>

export const defaultWorkingView: WorkingView = {
	bookColumns: defaultColumns.map(({ id }, position) => ({ id: id || '', position })),
	bookSorting: [],
	enableMultiSort: undefined,
	groupColumns: [],
	groupSorting: [],
	search: undefined,
}

export const buildDefaultWorkingView = (grouping?: SmartListGrouping): WorkingView => {
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

/**
 * Checks if a working view is equivalent to the default working view
 */
const isDefaultView = (view: WorkingView): boolean => {
	return Object.keys(defaultWorkingView).every((key) => {
		const viewValue = view[key as keyof WorkingView]
		const defaultValue = defaultWorkingView[key as keyof WorkingView]

		if (viewValue === undefined || viewValue === null) {
			return defaultValue === undefined || defaultValue === null
		}
		if (Array.isArray(viewValue) && Array.isArray(defaultValue)) {
			if (viewValue.length === 0 && defaultValue.length === 0) return true
			return JSON.stringify(viewValue) === JSON.stringify(defaultValue)
		}
		return viewValue === defaultValue
	})
}

export type SmartListViewState = {
	/** The current in-memory view state being modified */
	workingView?: WorkingView
	/** Updates the local working view without persisting */
	updateWorkingView: (updates: Partial<WorkingView>) => void
	/** Resets the working view to match the selected view (or undefined if no view selected) */
	resetWorkingView: () => void

	/** The currently selected saved view */
	selectedView?: SmartListView
	/** Selects a saved view and syncs workingView to match */
	selectStoredView: (view?: SmartListView) => void
}

type CreateStoreOptions = {
	defaultGrouping?: SmartListGrouping
}

export const createSmartListViewStore = ({ defaultGrouping }: CreateStoreOptions = {}) =>
	create<SmartListViewState>((set) => ({
		workingView: undefined,
		updateWorkingView: (updates) =>
			set((state) => {
				const base = state.workingView ?? buildDefaultWorkingView(defaultGrouping)
				const tentative = { ...base, ...updates }
				// If the view is now equivalent to default, reset to undefined
				return { workingView: isDefaultView(tentative) ? undefined : tentative }
			}),
		resetWorkingView: () =>
			set((state) => ({
				workingView: state.selectedView ? { ...state.selectedView } : undefined,
			})),

		selectedView: undefined,
		selectStoredView: (view) =>
			set({
				selectedView: view,
				workingView: view ? { ...view } : undefined,
			}),
	}))

export type SmartListViewStore = ReturnType<typeof createSmartListViewStore>

export const SmartListViewStoreContext = createContext<SmartListViewStore | null>(null)

export const useSmartListViewStore = <T>(selector: (state: SmartListViewState) => T): T => {
	const store = useContext(SmartListViewStoreContext)
	if (!store) {
		throw new Error('useSmartListViewStore must be used within a SmartListViewStoreProvider')
	}
	return useStore(store, selector)
}
