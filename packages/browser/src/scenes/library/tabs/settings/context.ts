import { ScanOptions, UpdateLibrary } from '@stump/sdk'
import { createContext, useContext } from 'react'

import { noop } from '@/utils/misc'

import { useLibraryContext } from '../../context'

export type ILibraryManagementContext = {
	/**
	 * A function that issues a PATCH update to the library.
	 */
	patch: (updates: Partial<UpdateLibrary>) => void
	/**
	 * A function that triggers a scan of the library. Will be undefined if the user does
	 * not have the necessary permissions
	 */
	scan?: (options?: ScanOptions) => void
}

export const LibraryManagementContext = createContext<ILibraryManagementContext>({
	patch: noop,
})
export const useLibraryManagement = () => {
	const libraryCtx = useLibraryContext()
	const managementCtx = useContext(LibraryManagementContext)
	return {
		library: libraryCtx.library,
		...managementCtx,
	}
}
