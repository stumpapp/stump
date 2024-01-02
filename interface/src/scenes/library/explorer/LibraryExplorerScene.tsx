import { mediaApi } from '@stump/api'
import { useDirectoryListing, useLibraryByIdQuery } from '@stump/client'
import { DirectoryListingFile } from '@stump/types'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { useMediaMatch } from 'rooks'

import paths from '../../../paths'
import { LibraryExplorerContext } from './context'
import FileExplorer from './FileExplorer'
import FileExplorerFooter, { FOOTER_HEIGHT } from './FileExplorerFooter'
import FileExplorerHeader, { HEADER_HEIGHT } from './FileExplorerHeader'

export default function LibraryExplorerScene() {
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const isMobile = useMediaMatch('(max-width: 768px)')
	const { library, isLoading } = useLibraryByIdQuery(id)

	// TODO: I need to store location.state somewhere so that when the user uses native navigation,
	// their history, or at the very least where they left off, is persisted.
	const { entries, setPath, path, goForward, goBack, canGoBack, canGoForward } =
		useDirectoryListing({
			enabled: !!library?.path,
			enforcedRoot: library?.path,
			initialPath: library?.path,
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

	// TODO: loading state ugly
	if (isLoading) {
		return null
	} else if (!library) {
		// TODO: render a proper not found image or something
		throw new Error('Library not found')
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

			<FileExplorerHeader />
			<div
				className="h-full w-full overflow-y-auto overflow-x-hidden"
				style={{
					marginBottom: FOOTER_HEIGHT + (isMobile ? 50 : 0),
					marginTop: HEADER_HEIGHT,
				}}
			>
				<FileExplorer files={entries} />
			</div>
			<FileExplorerFooter />
		</LibraryExplorerContext.Provider>
	)
}
