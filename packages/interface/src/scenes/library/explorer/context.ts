import { DirectoryListingFile } from '@stump/types'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type LibraryExplorerContextProps = {
	files: DirectoryListingFile[]
	onSelect: (item: DirectoryListingFile) => void
	canGoBack: boolean
	canGoForward: boolean
	goForward: () => void
	goBack: () => void
}

export const LibraryExplorerContext = createContext<LibraryExplorerContextProps>({
	canGoBack: false,
	canGoForward: false,
	files: [],
	goBack: noop,
	goForward: noop,
	onSelect: noop,
})
export const useFileExplorerContext = () => useContext(LibraryExplorerContext)
