export interface DirectoryListingFile {
	isDirectory: boolean;
	name: string;
	path: string;
}

export interface DirectoryListing {
	parent?: string;
	files: DirectoryListingFile[];
}

export interface DirectoryListingInput {
	path?: string;
}
