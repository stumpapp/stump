import { listDirectory } from '@stump/api'
import type { DirectoryListing } from '@stump/types'
import { AxiosError } from 'axios'
import { useMemo, useState } from 'react'

import { useQuery } from '../client'

export interface DirectoryListingQueryParams {
	enabled: boolean
	startingPath?: string
	page?: number
	goForward?: (callback: (path: string) => void) => void
	goBack?: (path: string | null) => void
}

export function useDirectoryListing({
	enabled,
	startingPath,
	page = 1,
	...props
}: DirectoryListingQueryParams) {
	const [path, setPath] = useState(startingPath || null)

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>()

	const { isLoading, error } = useQuery(
		['listDirectory', path, page],
		() => listDirectory({ page, path }),
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

	const actions = useMemo(
		() => ({
			// FIXME: does not work as expected. Need more complicated annoying solution.
			goBack() {
				if (directoryListing?.parent) {
					props.goBack?.(path)
					setPath(directoryListing.parent)
				}
			},
			goForward() {
				props.goForward?.((path) => setPath(path))
			},
			onSelect(directory: string) {
				setPath(directory)
			},
		}),
		[directoryListing, props, path],
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
