import { useDirectoryListing } from '@stump/client'
import { DirectoryListingFile } from '@stump/types'
import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router'
import { useMediaMatch } from 'rooks'

import paths from '@/paths'

import { ExplorerContext, ExplorerLayout } from './context'
import FileExplorer from './FileExplorer'
import FileExplorerFooter, { FOOTER_HEIGHT } from './FileExplorerFooter'
import FileExplorerHeader from './FileExplorerHeader'
import { getBook } from './FileThumbnail'

type Props = {
	rootPath: string
}

// TODO: fix scrolling issues after adjusting scene container...

export default function FileExplorerProvider({ rootPath }: Props) {
	const navigate = useNavigate()
	const isMobile = useMediaMatch('(max-width: 768px)')

	const [layout, setLayout] = useState<ExplorerLayout>(() => getDefaultLayout())

	// TODO: I need to store location.state somewhere so that when the user uses native navigation,
	// their history, or at the very least where they left off, is persisted.
	const { entries, setPath, path, goForward, goBack, canGoBack, canGoForward } =
		useDirectoryListing({
			enabled: !!rootPath,
			enforcedRoot: rootPath,
			initialPath: rootPath,
		})

	const handleSelect = async (entry: DirectoryListingFile) => {
		if (entry.is_directory) {
			setPath(entry.path)
		} else {
			try {
				const entity = await getBook(entry.path)
				if (entity) {
					navigate(paths.bookOverview(entity.id), {
						state: {
							forward_path: path,
						},
					})
				} else {
					toast.error('No associated DB entry found for this file')
				}
			} catch (err) {
				console.error(err)
				toast.error('An unknown error occurred')
			}
		}
	}

	const changeLayout = (newLayout: 'grid' | 'table') => {
		setDefaultLayout(newLayout)
		setLayout(newLayout)
	}

	return (
		<ExplorerContext.Provider
			value={{
				canGoBack: canGoBack && path !== rootPath,
				canGoForward,
				currentPath: path,
				files: entries,
				goBack,
				goForward,
				layout,
				onSelect: handleSelect,
				rootPath,
				setLayout: changeLayout,
			}}
		>
			<div className="flex h-full flex-1 flex-col">
				<FileExplorerHeader />
				<div
					className="flex-1"
					style={{
						marginBottom: FOOTER_HEIGHT + (isMobile ? 50 : 0),
					}}
				>
					<FileExplorer />
				</div>
				<FileExplorerFooter />
			</div>
		</ExplorerContext.Provider>
	)
}

const LOCAL_STORAGE_LAYOUT_KEY = 'stump-explorer-layout'
const getDefaultLayout = () => {
	const storedLayout = localStorage.getItem(LOCAL_STORAGE_LAYOUT_KEY)
	if (storedLayout === 'grid' || storedLayout === 'table') {
		return storedLayout
	}
	return 'grid'
}
const setDefaultLayout = (layout: ExplorerLayout) => {
	localStorage.setItem(LOCAL_STORAGE_LAYOUT_KEY, layout)
}
