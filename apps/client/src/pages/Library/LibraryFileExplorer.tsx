import { Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { getLibraryById } from '~api/library';
import { useDirectoryListing } from '../../hooks/useDirectoryListing';

function FolderIcon({ name }: { name: string }) {
	return (
		<button className="flex flex-col space-y-2 items-center justify-center">
			<img src="/icons/folder.png" className="h-20 w-20" />
			<Text maxW="20" fontSize="xs">
				{name}
			</Text>
		</button>
	);
}

export default function LibraryFileExplorer() {
	const { id } = useParams();

	if (!id) {
		throw new Error('Library id is required');
	}

	const { isLoading, data: library } = useQuery(['getLibrary', id], {
		queryFn: async () => getLibraryById(id).then((res) => res.data),
		onError: (err) => console.error(err),
	});

	const { entries } = useDirectoryListing({
		enabled: !!library?.path,
		startingPath: library!.path,
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
				<div className="flex-1 flex flex-row space-x-8 items-start justify-center md:justify-start pb-4">
					{entries.map((entry) => {
						if (entry.isDirectory) {
							return <FolderIcon name={entry.name} />;
						}

						return <div></div>;
					})}
				</div>
			</div>
		</>
	);
}
