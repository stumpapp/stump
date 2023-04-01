import { DirectoryListingFile } from '@stump/types'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type LibraryExplorerContextProps = {
	onSelect: (item: DirectoryListingFile) => void
}

export const LibraryExplorerContext = createContext<LibraryExplorerContextProps>({
	onSelect: noop,
})
export const useFileExplorerContext = () => useContext(LibraryExplorerContext)
