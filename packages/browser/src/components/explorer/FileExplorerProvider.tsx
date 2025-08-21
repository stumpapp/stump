import { useDirectoryListing, useSDK } from '@stump/client'
import { DirectoryListingFile } from '@stump/graphql'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import paths from '@/paths'

import { ExplorerContext, ExplorerLayout, IExplorerContext } from './context'
import FileExplorer from './FileExplorer'
import FileExplorerFooter, { FOOTER_HEIGHT } from './FileExplorerFooter'
import FileExplorerHeader from './FileExplorerHeader'
import { getBook } from './FileThumbnail'

type Props = Pick<IExplorerContext, 'libraryID' | 'rootPath' | 'uploadConfig'>

// TODO: refactor to match other explore scenes, e.g. sticky header + fixed footer + window scrolling

export default function FileExplorerProvider({ rootPath, ...ctx }: Props) {
	const navigate = useNavigate()
	const { sdk } = useSDK()

	const [layout, setLayout] = useState<ExplorerLayout>(() => getDefaultLayout())

	// TODO: I need to store location.state somewhere so that when the user uses native navigation,
	// their history, or at the very least where they left off, is persisted.
	const {
		entries,
		setPath,
		path,
		goForward,
		goBack,
		canGoBack,
		canGoForward,
		refetch,
		canLoadMore,
		loadMore,
	} = useDirectoryListing({
		enforcedRoot: rootPath,
		initialPath: rootPath,
	})

	const handleSelect = async (entry: DirectoryListingFile) => {
		if (entry.isDirectory) {
			setPath(entry.path)
		} else {
			try {
				const entity = await getBook(entry.path, sdk)
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

	const onLoadMore = useCallback(() => {
		if (canLoadMore) {
			loadMore()
		}
	}, [canLoadMore, loadMore])

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
				refetch,
				rootPath,
				setLayout: changeLayout,
				canLoadMore,
				loadMore: onLoadMore,
				...ctx,
			}}
		>
			<div className="flex h-full flex-1 flex-col">
				<FileExplorerHeader />
				<div
					className="flex-1"
					style={{
						marginBottom: FOOTER_HEIGHT,
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
