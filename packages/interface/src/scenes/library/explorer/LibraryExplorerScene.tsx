import { mediaApi } from '@stump/api'
import { useDirectoryListing, useLibraryByIdQuery } from '@stump/client'
import { DirectoryListingFile } from '@stump/types'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'

import paths from '../../../paths'
import { LibraryExplorerContext } from './context'
import FileExplorer from './FileExplorer'

// TODO: this is just a concept right now, its pretty ugly and I won't spend much more time on it
// until more of stump is compelted. That being said, if someone wants to run with this go for it!
// most of what would be needed on the backend is in place.
export default function LibraryExplorerScene() {
	const navigate = useNavigate()

	const { id } = useParams()
	if (!id) {
		throw new Error('Library id is required')
	}

	const { library, isLoading } = useLibraryByIdQuery(id)

	const { entries, onSelect, currentPath, goForward, goBack, canGoBack, canGoForward } =
		useDirectoryListing({
			enabled: !!library?.path,
			enforcedRoot: library?.path,
			initialPath: library?.path,
		})

	const handleSelect = async (entry: DirectoryListingFile) => {
		if (entry.is_directory) {
			onSelect(entry.path)
		} else {
			try {
				const response = await mediaApi.getMedia({
					path: entry.path,
				})
				const entity = response.data.data?.at(0)

				if (entity) {
					navigate(paths.bookOverview(entity.id), {
						state: {
							forward_path: currentPath,
						},
					})
				} else {
					toast.error('Media not found for selected file')
				}
			} catch (err) {
				console.error(err)
				toast.error('An unknown error occurred')
			}
		}
	}

	// TODO: loading state
	if (isLoading) {
		return null
	} else if (!library) {
		throw new Error('Library not found')
	}

	return (
		<LibraryExplorerContext.Provider
			value={{
				// FIXME: this is not correct. When you exit the library explorer and then re-enter (e.g. back button)
				// it needs to be able to go backwards to the previous path WITHOUT any history (i.e. using parent path).
				canGoBack,
				canGoForward,
				files: entries,
				goBack,
				goForward,
				onSelect: handleSelect,
			}}
		>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<div className="flex h-full w-full flex-col space-y-6 p-4">
				<FileExplorer files={entries} />
			</div>
		</LibraryExplorerContext.Provider>
	)
}
