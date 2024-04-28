import { Library } from '@stump/types'
import { createContext, useContext } from 'react'

import { noop } from '../../../../utils/misc'

export type LibraryAdminContextProps = {
	libraryPreview: Partial<Library>
	syncLibraryPreview: (library: Partial<Library>) => void
}

export const LibraryAdminContext = createContext<LibraryAdminContextProps>({
	libraryPreview: {},
	syncLibraryPreview: noop,
})
export const useLibraryAdminContext = () => useContext(LibraryAdminContext)
