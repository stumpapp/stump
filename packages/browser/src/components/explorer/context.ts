import { DirectoryListingFile, UploadConfig } from '@stump/sdk'
import { createContext, useContext } from 'react'

export type ExplorerLayout = 'grid' | 'table'

export type UploadParams = {
	files: File[]
	placeAt: string
	uploadAs: 'books' | 'series'
}

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
	refetch: () => Promise<unknown>
	uploadConfig?: UploadConfig
	libraryID: string
}

export const ExplorerContext = createContext<IExplorerContext | null>(null)
export const useFileExplorerContext = () => {
	const context = useContext(ExplorerContext)
	if (!context) {
		throw new Error('useFileExplorerContext must be used within a FileExplorerProvider')
	}
	return context
}
