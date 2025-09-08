import { DirectoryListingInput, graphql } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PREFETCH_STALE_TIME } from '../client'
import { useGraphQL, useInfiniteGraphQL } from '../hooks'
import { useSDK } from '../sdk'

const query = graphql(`
	query DirectoryListing($input: DirectoryListingInput!, $pagination: Pagination!) {
		listDirectory(input: $input, pagination: $pagination) {
			nodes {
				parent
				files {
					name
					path
					isDirectory
					media {
						id
						resolvedName
						thumbnail {
							url
						}
						extension
					}
				}
			}
			pageInfo {
				__typename
				... on OffsetPaginationInfo {
					currentPage
					totalPages
					pageSize
					pageOffset
					zeroBased
				}
			}
		}
	}
`)

type PrefetchFilesParams = {
	path: string
	ignoreParams?: Omit<DirectoryListingInput, 'path'>
	fetchConfig?: boolean
}

export const usePrefetchFiles = () => {
	const { sdk } = useSDK()

	const client = useQueryClient()
	const prefetch = useCallback(
		({ path, ignoreParams = { ignoreHidden: true }, fetchConfig }: PrefetchFilesParams) =>
			Promise.all([
				client.prefetchInfiniteQuery({
					queryKey: ['listDirectory', path, ignoreParams, 1],
					initialPageParam: {
						offset: {
							page: 1,
							pageSize: 100,
						},
					},
					queryFn: ({ pageParam }) =>
						sdk.execute(query, {
							input: {
								path,
								...ignoreParams,
							},
							pagination: pageParam,
						}),
					staleTime: PREFETCH_STALE_TIME,
				}),
				...(fetchConfig
					? [
							client.prefetchQuery({
								queryKey: ['uploadConfig'],
								queryFn: () => sdk.execute(uploadConfigQuery),
								staleTime: PREFETCH_STALE_TIME,
							}),
						]
					: []),
			]),
		[client, sdk],
	)

	return prefetch
}

export type DirectoryListingQueryParams = {
	/**
	 * The initial path to query for. If not provided, the root directory will be queried for.
	 */
	initialPath?: string
	/**
	 * Additional parameters to pass to the directory listing query.
	 */
	ignoreParams?: Omit<DirectoryListingInput, 'path'>
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
	initialPath,
	ignoreParams = { ignoreHidden: true },
	enforcedRoot,
	page = 1,
	onGoForward,
	onGoBack,
}: DirectoryListingQueryParams) {
	const [currentPath, setCurrentPath] = useState(initialPath || null)
	const [history, setHistory] = useState(currentPath ? [currentPath] : [])
	const [currentIndex, setCurrentIndex] = useState(0)

	const [initialPage, setInitialPage] = useState(() => page)

	const { isLoading, error, data, refetch, ...rest } = useInfiniteGraphQL(
		query,
		['listDirectory', currentPath, ignoreParams, initialPage],
		{
			input: {
				path: currentPath,
				...ignoreParams,
			},
			pagination: {
				offset: {
					page: initialPage,
					pageSize: 100,
				},
			},
		},
	)

	/**
	 * Whenever the current path changes, reset the initial page to 1. This is because
	 * we are using a somewhat complex pagination state that is shared between different
	 * directories. For example, if I scroll 4 pages deep into one directory, then switch
	 * to another directory, the new directory should start at page 1.
	 */
	useEffect(() => {
		setInitialPage(1)
	}, [currentPath])

	const directoryListing = data?.pages
		.flatMap((page) => page.listDirectory.nodes)
		.reduce(
			(acc, curr) => ({
				files: [...acc.files, ...curr.files],
				parent: curr.parent,
			}),
			{ files: [], parent: null },
		)
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
		} else {
			setCurrentPath(null)
			setHistory([])
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

	const isWindowsDriveRoot = (path: string | null) => {
		if (path == null) {
			return false
		}

		// eslint-disable-next-line no-useless-escape
		const windowsRootRegex = /^[A-Z]:[\/\\]{1,2}$/i
		return windowsRootRegex.test(path)
	}

	const setPath = useCallback(
		(directory: string | null, direction: 1 | -1 = 1) => {
			// Handle nulling the path
			if (directory == null) {
				setCurrentPath(directory)
				setCurrentIndex(0)
				return
			}

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
		return hasBackHistory || isWindowsDriveRoot(currentPath) || isPathAllowed(parent || '')
	}, [hasBackHistory, parent, currentPath, isPathAllowed])

	const goBackInHistory = useCallback(() => {
		if (directoryListing?.parent == null && isWindowsDriveRoot(currentPath)) {
			onGoBack?.(null)
			setCurrentPath(null)
			setCurrentIndex(0)
			return
		}

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
	}, [enforcedRoot, directoryListing, currentPath, onGoBack])

	const goBack = useCallback(() => {
		if (!canGoBack) return
		if (hasBackHistory || isWindowsDriveRoot(currentPath)) {
			goBackInHistory()
		} else {
			setPath(parent || null, -1)
		}
	}, [hasBackHistory, canGoBack, goBackInHistory, parent, currentPath, setPath])

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
		if (!error) return null

		// TODO(graphql): I need to test the error handling here after swapping to graphql since
		// we won't be using status codes etc. This just won't work
		if (!isAxiosError(error)) {
			console.error('An unknown error occurred', error)
			return 'An unknown error occurred'
		}

		if (error?.response?.data) {
			if (error.response.status === 404) {
				return 'Directory not found'
			} else if (error.response.status === 403) {
				return 'Access to the directory was denied by the OS'
			} else {
				console.error('An error occurred while fetching the directory listing:', error)
				const message =
					typeof error.response.data === 'string'
						? error.response.data
						: 'An error occurred while fetching the directory listing'
				return message
			}
		}

		return null
	}, [error])

	useEffect(() => {
		if (!isAxiosError(error)) return
		if (error.response?.status === 403) {
			const parent = currentPath?.split('/').slice(0, -1).join('/') || null
			if (parent) {
				onGoBack?.(parent)
				setCurrentPath(parent)
				setCurrentIndex((prev) => Math.max(prev - 1, 0))
			}
		}
	}, [error, currentPath, onGoBack, setCurrentPath, setCurrentIndex])

	return {
		canGoBack,
		canGoForward,
		directories: directoryListing?.files.filter((f) => f.isDirectory) ?? [],
		entries: directoryListing?.files ?? [],
		error,
		errorMessage,
		goBack,
		goForward,
		isLoading,
		isPathAllowed,
		parent: directoryListing?.parent,
		path: currentPath,
		refetch,
		setPath,
		canLoadMore: rest.hasNextPage || false,
		loadMore: rest.fetchNextPage,
	}
}

const uploadConfigQuery = graphql(`
	query UploadConfig {
		uploadConfig {
			enabled
			maxFileUploadSize
		}
	}
`)

type UploadConfigQueryParams = {
	enabled?: boolean
}

export const useUploadConfig = ({ enabled }: UploadConfigQueryParams) => {
	const { data, ...restRet } = useGraphQL(uploadConfigQuery, ['uploadConfig'], undefined, {
		enabled,
	})
	return { uploadConfig: data?.uploadConfig, ...restRet }
}
