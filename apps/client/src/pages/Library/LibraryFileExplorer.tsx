import { Text } from '@chakra-ui/react';
import { DirectoryListingFile } from '@stump/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/library';
import { useDirectoryListing } from '../../hooks/useDirectoryListing';

interface ExplorerFileProps extends DirectoryListingFile {}

function ExplorerFile({ name, path, isDirectory }: ExplorerFileProps) {
	function getIconSrc() {
		const archivePattern = new RegExp(/^.*\.(cbz|zip|rar|cbr)$/gi);

		if (isDirectory) {
			return '/icons/folder.png';
		} else if (archivePattern.test(path)) {
			// TODO: no lol, I want to try and render a small preview still
			// will have to create a new endpoint to try and grab a thumbnail by path
			return '/icons/archive.svg';
		} else if (path.endsWith('.epub')) {
			return '/icons/epub.svg';
		} else {
			return '';
		}
	}

	return (
		<button className="flex flex-col space-y-2 items-center justify-center">
			{/* FIXME: don't use images for svg fallbacks... or, just set color of images... */}
			<img src={getIconSrc()} className="h-20 w-20" />
			<Text maxW="20" fontSize="xs">
				{name}
			</Text>
		</button>
	);
}

// TODO: this is just a concept right now, its pretty ugly and I won't spend much more time on it
// until more of stump is compelted. That being said, if someone wants to run with this go for it!
// most of what would be needed on the backend is in place.
export default function LibraryFileExplorer() {
	const mounted = useRef(false);

	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	useEffect(() => {
		if (!mounted.current) {
			toast('This feature is planned. No functionality is implemented yet.');

			mounted.current = true;
		}
	}, []);

	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
		onError: (err) => console.error(err),
	});

	// TODO: make different hook
	const { entries } = useDirectoryListing({
		enabled: !!library?.path,
		startingPath: library?.path,
	});

	// TODO: loading state
	if (isLoading) {
		return null;
	} else if (!library) {
		throw new Error('Library not found');
	}

	return (
		<>
			<Helmet>
				<title>Stump | {library.name}</title>
			</Helmet>

			<div className="p-4 w-full h-full flex flex-col space-y-6">
				<div className="flex-1 flex flex-row flex-wrap space-x-8 items-start justify-center md:justify-start pb-4">
					{entries.map((entry) => (
						<ExplorerFile key={entry.path} {...entry} />
					))}
				</div>
			</div>
		</>
	);
}
