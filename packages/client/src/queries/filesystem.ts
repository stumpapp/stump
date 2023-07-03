import { filesystemApi, filesystemQueryKeys } from '@stump/api'
import type { DirectoryListing } from '@stump/types'
import { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useQuery } from '../client'

// TODO: use QueryOptions and usePageQuery instead of DirectoryListingQueryParams
export interface DirectoryListingQueryParams {
	enabled: boolean
	/**
	 * The initial path to query for. If not provided, the root directory will be queried for.
	 */
	initialPath?: string
	/**
	 * The minimum path that can be queried for. This is useful for enforcing no access to parent
	 * directories relative to the enforcedRoot.
	 */
	enforcedRoot?: string
	page?: number
	/**
	 * A callback that will be called when navigating forward in the directory listing.
	 */
	onGoForward?: (path: string | null) => void
	/**
	 * A callback that will be called when navigating back in the directory listing.
	 */
	onGoBack?: (path: string | null) => void
}

export function useDirectoryListing({
	enabled,
	initialPath,
	enforcedRoot,
	page = 1,
	onGoForward,
	onGoBack,
}: DirectoryListingQueryParams) {
	const [currentPath, setCurrentPath] = useState(initialPath || null)
	const [history, setHistory] = useState(currentPath ? [currentPath] : [])
	const [currentIndex, setCurrentIndex] = useState(0)

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>()

	const { isLoading, error } = useQuery(
		[filesystemQueryKeys.listDirectory, currentPath, page],
		() => filesystemApi.listDirectory({ page, path: currentPath }),
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

	useEffect(() => {
		if (initialPath) {
			setCurrentPath(initialPath)
			setHistory((curr) => {
				if (curr.length === 0) {
					return [initialPath]
				} else {
					// TODO: I think this is right, but am lazy rn to add a ref lol
					// return curr.slice(0, currentIndex + 1).concat(initialPath)
					return [...curr, initialPath]
				}
			})
		}
	}, [initialPath])

	const canGoBack = useMemo(() => {
		return currentIndex > 0
	}, [currentIndex])

	const goBack = useCallback(() => {
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
			onGoBack?.(directoryListing.parent)
			setCurrentPath(directoryListing.parent)
			setCurrentIndex((prev) => prev - 1)
		}
	}, [enforcedRoot, directoryListing, onGoBack])

	const canGoForward = useMemo(() => {
		return history.length > currentIndex + 1
	}, [history, currentIndex])

	const goForward = useCallback(() => {
		const nextPath = history[currentIndex + 1]
		if (nextPath) {
			onGoForward?.(nextPath)
			setCurrentPath(nextPath)
			setCurrentIndex((prev) => prev + 1)
		}
	}, [history, currentIndex, onGoForward])

	const onSelect = useCallback(
		(directory: string) => {
			setCurrentPath(directory)
			// we need to splice anything after the current index, because we are creating a new
			// history branch.
			setHistory((prev) => prev.slice(0, currentIndex + 1).concat(directory))
			setCurrentIndex((prev) => prev + 1)
		},
		[currentIndex],
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
		canGoBack,
		canGoForward,
		currentPath,
		directories: directoryListing?.files.filter((f) => f.is_directory) ?? [],
		entries: directoryListing?.files ?? [],
		error,
		errorMessage,
		goBack,
		goForward,
		isLoading,
		onSelect,
		parent: directoryListing?.parent,
	}
}
