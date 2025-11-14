/* eslint-disable @typescript-eslint/no-require-imports */
import * as Sentry from '@sentry/react-native'
import { Asset, useAssets } from 'expo-asset'
import { createContext, type ReactNode, useContext, useEffect } from 'react'

// Note: I couldn't find good information on if using useAssets many times in a flashlist would
// be a problem, so I just made a context to load them once for the file browser.
// If it isn't a problem, we can remove this context and just use useAssets directly where needed.

type FileExplorerAssets = {
	folder: Asset
	folderLight: Asset
	document: Asset
	documentLight: Asset
	archive: Asset
	archiveLight: Asset
	documentPdf: Asset
	documentPdfLight: Asset
}

const FileExplorerAssetsContext = createContext<FileExplorerAssets | null>(null)

const ICON_REQUIRES = [
	require('../../assets/icons/Folder.png'),
	require('../../assets/icons/Folder_Light.png'),
	require('../../assets/icons/Document.png'),
	require('../../assets/icons/Document_Light.png'),
	require('../../assets/icons/Archive.png'),
	require('../../assets/icons/Archive_Light.png'),
	require('../../assets/icons/Document_pdf.png'),
	require('../../assets/icons/Document_pdf_Light.png'),
]

export function FileExplorerAssetsProvider({ children }: { children: ReactNode }) {
	const [assets, error] = useAssets(ICON_REQUIRES)

	useEffect(() => {
		if (error) {
			Sentry.captureException(error, { tags: { component: 'FileExplorerAssetsContext' } })
		}
	}, [error])

	if (!assets) {
		return null
	}

	const contextValue: FileExplorerAssets = {
		folder: assets[0],
		folderLight: assets[1],
		document: assets[2],
		documentLight: assets[3],
		archive: assets[4],
		archiveLight: assets[5],
		documentPdf: assets[6],
		documentPdfLight: assets[7],
	}

	return (
		<FileExplorerAssetsContext.Provider value={contextValue}>
			{children}
		</FileExplorerAssetsContext.Provider>
	)
}

export function useFileExplorerAssets() {
	const context = useContext(FileExplorerAssetsContext)
	if (!context) {
		throw new Error('useFileExplorerAssets must be used within FileExplorerAssetsProvider')
	}
	return context
}
