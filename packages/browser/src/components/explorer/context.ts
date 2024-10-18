import { DirectoryListingFile } from '@stump/sdk'
import { createContext, useContext } from 'react'

import { noop } from '../../utils/misc'

export type ExplorerLayout = 'grid' | 'table'

export type IExplorerContext = {
	layout: ExplorerLayout
	setLayout: (layout: ExplorerLayout) => void
	currentPath: string | null
	rootPath: string
	files: DirectoryListingFile[]
	onSelect: (item: DirectoryListingFile) => void
	canGoBack: boolean
	canGoForward: boolean
	goForward: () => void
	goBack: () => void
	displayUpload: boolean
}

export const ExplorerContext = createContext<IExplorerContext>({
	canGoBack: false,
	canGoForward: false,
	currentPath: null,
	displayUpload: false,
	files: [],
	goBack: noop,
	goForward: noop,
	layout: 'grid',
	onSelect: noop,
	rootPath: '',
	setLayout: noop,
})
export const useFileExplorerContext = () => useContext(ExplorerContext)
