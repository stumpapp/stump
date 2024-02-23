import { mediaApi } from '@stump/api'
import { useDirectoryListing } from '@stump/client'
import { DirectoryListingFile } from '@stump/types'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import paths from '@/paths'

import { useLibraryContext } from '../context'
import { LibraryExplorerContext } from './context'
import FileExplorer from './FileExplorer'
import FileExplorerFooter, { FOOTER_HEIGHT } from './FileExplorerFooter'
import FileExplorerHeader from './FileExplorerHeader'

// TODO: abstract this away from library as to use it with other entities

export default function LibraryExplorerScene() {
	const navigate = useNavigate()
	const isMobile = useMediaMatch('(max-width: 768px)')

	const { library } = useLibraryContext()

	// TODO: I need to store location.state somewhere so that when the user uses native navigation,
	// their history, or at the very least where they left off, is persisted.
	const { entries, setPath, path, goForward, goBack, canGoBack, canGoForward } =
		useDirectoryListing({
			enabled: !!library.path,
			enforcedRoot: library.path,
			initialPath: library.path,
		})

	const handleSelect = async (entry: DirectoryListingFile) => {
		if (entry.is_directory) {
			setPath(entry.path)
		} else {
			try {
				const response = await mediaApi.getMedia({
					path: entry.path,
				})
				const entity = response.data.data?.at(0)

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

	return (
		<LibraryExplorerContext.Provider
			value={{
				canGoBack,
				canGoForward,
				currentPath: path,
				files: entries,
				goBack,
				goForward,
				libraryPath: library.path,
				onSelect: handleSelect,
			}}
		>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<div className="flex flex-col">
				<FileExplorerHeader />
				<div
					className="flex-1"
					style={{
						marginBottom: FOOTER_HEIGHT + (isMobile ? 50 : 0),
					}}
				>
					<FileExplorer files={entries} />
				</div>
				<FileExplorerFooter />
			</div>
		</LibraryExplorerContext.Provider>
	)
}
