import type { DirectoryListing } from '../types';
import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { listDirectory } from '../api/filesystem';
import { StumpQueryContext } from '../context';

export interface DirectoryListingQueryParams {
	enabled: boolean;
	startingPath?: string;
	page?: number;
}

export function useDirectoryListing({
	enabled,
	startingPath,
	page = 1,
}: DirectoryListingQueryParams) {
	const [path, setPath] = useState(startingPath || null);

	const [directoryListing, setDirectoryListing] = useState<DirectoryListing>();

	const { isLoading, error } = useQuery(
		['listDirectory', path, page],
		() => listDirectory({ path, page }),
		{
			// Do not run query until `enabled` aka modal is opened.
			enabled,
			suspense: false,
			onSuccess(res) {
				setDirectoryListing(res.data.data);
			},
			context: StumpQueryContext,
		},
	);

	const actions = useMemo(
		() => ({
			goBack() {
				if (directoryListing?.parent) {
					setPath(directoryListing.parent);
				}
			},
			onSelect(directory: string) {
				setPath(directory);
			},
		}),
		[directoryListing],
	);

	const errorMessage = useMemo(() => {
		let err = error as AxiosError;

		if (err?.response?.data) {
			if (err.response.status === 404) {
				return 'Directory not found';
			} else {
				return err.response.data as string;
			}
		}

		return null;
	}, [error]);

	return {
		isLoading,
		error,
		errorMessage,
		path,
		entries: directoryListing?.files ?? [],
		parent: directoryListing?.parent,
		directories: directoryListing?.files.filter((f) => f.is_directory) ?? [],
		// files: directoryListing?.files.filter((f) => !f.isDirectory) ?? [],
		...actions,
	};
}
