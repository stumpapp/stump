import { CreateOrUpdateLibraryInput, LibrarySettingsConfigFragment } from '@stump/graphql'
import { ScanOptions } from '@stump/sdk'
import { createContext, useContext } from 'react'

import { ILibraryContext } from '../../context'

export type ILibraryManagementContext = {
	library: ILibraryContext['library'] & LibrarySettingsConfigFragment
	/**
	 * A function that issues a PATCH update to the library.
	 */
	patch: (updates: Partial<CreateOrUpdateLibraryInput>) => void
	/**
	 * A function that triggers a scan of the library. Will be undefined if the user does
	 * not have the necessary permissions
	 */
	scan?: (options?: ScanOptions) => void
}

export const LibraryManagementContext = createContext<ILibraryManagementContext | null>(null)
export const useLibraryManagement = () => {
	const managementCtx = useContext(LibraryManagementContext)
	if (!managementCtx) {
		throw new Error('useLibraryManagement must be used within a LibraryManagementContext.Provider')
	}
	return managementCtx
}
