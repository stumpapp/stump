interface DirectoryListingFile {
	isDirectory: boolean;
	name: string;
	path: string;
}

interface DirectoryListing {
	parent?: string;
	files: DirectoryListingFile[];
}

interface DirectoryListingInput {
	path?: string;
}
