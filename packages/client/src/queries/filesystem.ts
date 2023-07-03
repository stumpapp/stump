import { filesystemApi, filesystemQueryKeys } from '@stump/api'
import type { DirectoryListing } from '@stump/types'
import { AxiosError } from 'axios'
import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '../client'

// TODO: use QueryOptions and usePageQuery instead of DirectoryListingQueryParams
export interface DirectoryListingQueryParams {
	enabled: boolean
	startingPath?: string
	// TODO: I kind of hate this name...
	/**
	 * The minimum path that can be queried for. This is useful for enforcing no access to parent
	 * directories relative to the enforcedRoot.
	 */
	enforcedRoot?: string
	page?: number
	onGoForward?: (callback: (path: string) => void) => void
	onGoBack?: (path: string | null) => void
}

export function useDirectoryListing({
	enabled,
	startingPath,
	enforcedRoot,
	page = 1,
	onGoForward,
	onGoBack,
}: DirectoryListingQueryParams) {
	const [path, setPath] = useState(startingPath || null)

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>()

	const { isLoading, error } = useQuery(
		[filesystemQueryKeys.listDirectory, path, page],
		() => filesystemApi.listDirectory({ page, path }),
		{
			// Do not run query until `enabled` aka modal is opened.
			enabled,
			keepPreviousData: true,
			onSuccess(res) {
				setDirectoryListing(res.data.data)
			},
			suspense: false,
		},
	)

	// Re-set path if startingPath changes.
	useEffect(() => {
		if (startingPath) {
			setPath(startingPath)
		}
	}, [startingPath])

	const actions = useMemo(
		() => ({
			// FIXME: does not work as expected. Need more complicated annoying solution.
			goBack() {
				const parent = directoryListing?.parent || ''
				// If there is no parent, we are at the root directory, so we don't want to go back.
				if (!parent) {
					return
				}

				// if parent comes BEFORE enforcedRoot, then we are trying to go back to a parent
				// directory that is not allowed. In this case, we don't want to go back.
				if (enforcedRoot !== parent && enforcedRoot?.startsWith(parent)) {
					return
				}

				if (directoryListing?.parent) {
					onGoBack?.(path)
					setPath(directoryListing.parent)
				}
			},
			goForward() {
				if (!onGoForward) {
					console.warn('goForward was called without an onGoForward callback')
				} else {
					onGoForward((path) => setPath(path))
				}
			},
			onSelect(directory: string) {
				setPath(directory)
			},
		}),
		[directoryListing, onGoBack, onGoForward, path, enforcedRoot],
	)

	const errorMessage = useMemo(() => {
		const err = error as AxiosError

		if (err?.response?.data) {
			if (err.response.status === 404) {
				return 'Directory not found'
			} else {
				return err.response.data as string
			}
		}

		return null
	}, [error])

	return {
		directories: directoryListing?.files.filter((f) => f.is_directory) ?? [],
		entries: directoryListing?.files ?? [],
		error,
		errorMessage,
		isLoading,
		parent: directoryListing?.parent,
		path,
		...actions,
	}
}
