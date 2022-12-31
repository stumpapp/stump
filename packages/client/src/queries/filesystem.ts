import { AxiosError } from 'axios'
import { useMemo, useState } from 'react'

import { listDirectory } from '../api/filesystem'
import { useQuery } from '../client'
import type { DirectoryListing } from '../types'

export interface DirectoryListingQueryParams {
	enabled: boolean
	startingPath?: string
	page?: number
}

export function useDirectoryListing({
	enabled,
	startingPath,
	page = 1,
}: DirectoryListingQueryParams) {
	const [path, setPath] = useState(startingPath || null)

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>()

	const { isLoading, error } = useQuery(
		['listDirectory', path, page],
		() => listDirectory({ page, path }),
		{
			// Do not run query until `enabled` aka modal is opened.
			enabled,
			onSuccess(res) {
				setDirectoryListing(res.data.data)
			},
			suspense: false,
		},
	)

	const actions = useMemo(
		() => ({
			goBack() {
				if (directoryListing?.parent) {
					setPath(directoryListing.parent)
				}
			},
			onSelect(directory: string) {
				setPath(directory)
			},
		}),
		[directoryListing],
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
		// files: directoryListing?.files.filter((f) => !f.isDirectory) ?? [],
		...actions,
	}
}
