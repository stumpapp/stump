import { getMedia } from '@stump/api'
import { useDirectoryListing, useLibrary } from '@stump/client'
import { DirectoryListingFile } from '@stump/types'
import { useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { LibraryExplorerContext } from './context'
import FileExplorer from './FileExplorer'

// TODO: this is just a concept right now, its pretty ugly and I won't spend much more time on it
// until more of stump is compelted. That being said, if someone wants to run with this go for it!
// most of what would be needed on the backend is in place.
export default function LibraryExplorerScene() {
	const mounted = useRef(false)

	const navigate = useNavigate()
	const { state } = useLocation()

	const { id } = useParams()

	if (!id) {
		throw new Error('Library id is required')
	}

	useEffect(() => {
		if (!mounted.current) {
			toast('This feature is planned. No functionality is implemented yet.')

			mounted.current = true
		}
	}, [])

	const { library, isLoading } = useLibrary(id, {
		onError(err) {
			console.error(err)
		},
	})

	// TODO: make different hook for explorer, will need a separate endpoint to
	// compare paths with DB media entries to pair them up (used for navigation and file icons)
	const { entries, onSelect, path } = useDirectoryListing({
		enabled: !!library?.path,
		startingPath: state?.starting_path || library?.path,
	})

	const handleSelect = async (entry: DirectoryListingFile) => {
		if (entry.is_directory) {
			onSelect(entry.path)
		} else {
			try {
				const response = await getMedia({
					path: entry.path,
				})
				const entity = response.data.data?.at(0)

				if (entity) {
					navigate(`/books/${entity.id}`, {
						state: {
							starting_path: path,
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
		<LibraryExplorerContext.Provider value={{ onSelect: handleSelect }}>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<div className="flex h-full w-full flex-col space-y-6 p-4">
				<FileExplorer files={entries} />
			</div>
		</LibraryExplorerContext.Provider>
	)
}
