import { CreateOrUpdateLibraryInput, LibrarySettingsConfigFragment } from '@stump/graphql'
import { createContext, useContext } from 'react'

import { ILibraryContext } from '../../context'
import { ScanOptions } from './options/scanner/history/ScanHistoryTable'

export type LibraryPatchParams = Omit<Partial<CreateOrUpdateLibraryInput>, 'config'> & {
	config: Partial<CreateOrUpdateLibraryInput['config']>
}

export type ILibraryManagementContext = {
	library: ILibraryContext['library'] & LibrarySettingsConfigFragment
	/**
	 * A function that issues a PATCH update to the library.
	 */
	patch: (updates: LibraryPatchParams) => void
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

export const useLibraryManagementSafe = () => useContext(LibraryManagementContext)
