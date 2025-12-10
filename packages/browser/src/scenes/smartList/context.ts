import { AccessRole, SaveSmartListInput, SmartListMeta } from '@stump/graphql'
import { createContext, useContext } from 'react'

import { SmartListParsed } from './graphql'
import { buildDefaultWorkingView, useSmartListViewStore } from './store'

export { defaultWorkingView, type WorkingView } from './store'

export type ISmartListContext = {
	list: SmartListParsed
	meta?: SmartListMeta

	patchSmartList: (updates: Partial<SaveSmartListInput>) => Promise<void>

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

/**
 * A hook that provides access to the working view with a guaranteed non-undefined value.
 * If no working view is set, returns the default working view based on the list's grouping.
 */
export const useSafeWorkingView = () => {
	const {
		list: { defaultGrouping },
	} = useSmartListContext()

	const workingView = useSmartListViewStore((s) => s.workingView)
	const updateWorkingView = useSmartListViewStore((s) => s.updateWorkingView)

	const workingViewIsDefined = !!workingView

	return {
		updateWorkingView,
		workingView: workingView || buildDefaultWorkingView(defaultGrouping),
		workingViewIsDefined,
	}
}
