import { filesystemApi, filesystemQueryKeys } from '@stump/api'
import { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { queryClient, useQuery } from '../client'

export const prefetchLibraryFiles = (path: string) =>
	queryClient.prefetchQuery([filesystemQueryKeys.listDirectory, path, 1], async () => {
		const { data } = await filesystemApi.listDirectory({ page: 1, path })
		return data
	})

export const prefetchFiles = (path: string) =>
	queryClient.prefetchQuery([filesystemQueryKeys.listDirectory, path, 1], async () => {
		const { data } = await filesystemApi.listDirectory({ page: 1, path })
		return data
	})

export type DirectoryListingQueryParams = {
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
	/**
	 * The current page of the paginated result. If not provided, the query result will
	 * be unpaginated.
	 */
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

	const { isLoading, error, data } = useQuery(
		[filesystemQueryKeys.listDirectory, currentPath, page],
		async () => {
			const { data } = await filesystemApi.listDirectory({ page, path: currentPath })
			return data
		},
		{
			// Do not run query until `enabled` aka modal is opened.
			enabled,
			keepPreviousData: true,
			suspense: false,
		},
	)

	const directoryListing = data?.data
	const parent = directoryListing?.parent

	useEffect(() => {
		if (initialPath) {
			setCurrentPath(initialPath)
			setHistory((curr) => {
				if (curr.length === 0) {
					return [initialPath]
				} else if (!curr.includes(initialPath)) {
					return [...curr, initialPath]
				} else {
					return curr
				}
			})
		}
	}, [initialPath])

	const isPathAllowed = useCallback(
		(path: string) => {
			if (!path || (enforcedRoot !== path && enforcedRoot?.startsWith(path))) {
				return false
			}
			return true
		},
		[enforcedRoot],
	)

	const setPath = useCallback(
		(directory: string, direction: 1 | -1 = 1) => {
			let newIndex = currentIndex + direction
			let newHistory: string[]
			// A -1 indicates that we don't have previous history when we called setPath, so we
			// need to add the current path to the history ahead of where we are going next.
			setHistory((curr) => {
				if (direction === -1) {
					newHistory = [...curr.slice(0, currentIndex + 1), directory]
				} else {
					// When we manually set the path, history needs to be reset, keeping
					// the current path as the first entry and the new path as the second.
					newHistory = [curr[0] || '', directory].filter(Boolean)
				}
				newIndex = newHistory.length - 1
				return newHistory
			})
			setCurrentPath(directory)
			setCurrentIndex(newIndex)
		},
		[currentIndex],
	)

	const hasBackHistory = useMemo(() => {
		return currentIndex > 0
	}, [currentIndex])

	const canGoBack = useMemo(() => {
		return hasBackHistory || isPathAllowed(parent || '')
	}, [hasBackHistory, parent, isPathAllowed])

	const goBackInHistory = useCallback(() => {
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

	const goBack = useCallback(() => {
		if (!canGoBack) return
		if (hasBackHistory) {
			goBackInHistory()
		} else {
			setPath(parent || '', -1)
		}
	}, [hasBackHistory, canGoBack, goBackInHistory, parent, setPath])

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
		directories: directoryListing?.files.filter((f) => f.is_directory) ?? [],
		entries: directoryListing?.files ?? [],
		error,
		errorMessage,
		goBack,
		goForward,
		isLoading,
		isPathAllowed,
		parent: directoryListing?.parent,
		path: currentPath,
		setPath,
	}
}
