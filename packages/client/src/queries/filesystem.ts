import {
	DirectoryListingInput,
	DirectoryListingQuery,
	extractErrorMessage,
	graphql,
} from '@stump/graphql'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
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

export type UseDirectoryListingFile = DirectoryListingQuery['listDirectory']['nodes'][0]['files'][0]

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
		{
			placeholderData: keepPreviousData,
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

			setHistory((curr) => {
				if (direction === -1) {
					// navigating backwards via filesystem parent (no history entry) -> insert the
					// parent before the current position to retain history
					return [...curr.slice(0, currentIndex), directory, ...curr.slice(currentIndex)]
				}
				return [...curr.slice(0, currentIndex + 1), directory]
			})
			setCurrentPath(directory)
			setCurrentIndex(direction === -1 ? currentIndex : currentIndex + 1)
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

		if (!hasBackHistory) return

		// use the history stack instead of the filesystem parent so that non-linear
		// navigation (e.g. jumping directly into a deep path) is handled correctly
		const prevPath = history[currentIndex - 1]
		if (prevPath === undefined) return

		// if prevPath comes BEFORE enforcedRoot, then we are trying to go back to a
		// directory that is not allowed. In this case, we don't want to go back.
		if (enforcedRoot !== prevPath && enforcedRoot?.startsWith(prevPath)) return

		onGoBack?.(prevPath)
		setCurrentPath(prevPath)
		setCurrentIndex((prev) => prev - 1)
	}, [history, currentIndex, hasBackHistory, enforcedRoot, directoryListing, currentPath, onGoBack])

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

		if (!isAxiosError(error)) {
			console.error('An unknown error occurred', error)
			return extractErrorMessage(error)
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
