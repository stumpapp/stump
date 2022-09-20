import { Text } from '@chakra-ui/react';
import { DirectoryListingFile } from '@stump/core';

interface FileExplorerProps {
	files: DirectoryListingFile[];
}

// TODO: this needs to be virtualized, as I am not paginating it like other lists/grids throughout Stump.
// Look into -> https://tanstack.com/virtual/v3, doesn't look too bad
// TODO: this needs to have grid and list layout options
export default function FileExplorer({ files }: FileExplorerProps) {
	return (
		<div className="grid grid-cols-4 gap-6 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 items-start justify-center md:justify-start">
			{files.map((file) => (
				<ExplorerFile key={file.path} {...file} />
			))}
		</div>
	);
}

// Lol the name is just reversed...
function ExplorerFile({ name, path, is_directory }: DirectoryListingFile) {
	function getIconSrc() {
		const archivePattern = new RegExp(/^.*\.(cbz|zip|rar|cbr)$/gi);

		if (is_directory) {
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
			<img src={getIconSrc()} className="h-20 w-20 active:scale-[.99]" />
			<Text maxW="20" fontSize="xs">
				{name}
			</Text>
		</button>
	);
}
