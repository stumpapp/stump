import { DirectoryListingFile } from '@stump/types'
import { createContext, useContext } from 'react'

import { noop } from '../../../utils/misc'

export type LibraryExplorerContextProps = {
	currentPath: string | null
	libraryPath: string
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
	currentPath: null,
	files: [],
	goBack: noop,
	goForward: noop,
	libraryPath: '',
	onSelect: noop,
})
export const useFileExplorerContext = () => useContext(LibraryExplorerContext)
