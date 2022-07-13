import { Media } from './Media';

export interface EpubContent {
	label: string;
	content: string;
	playOrder: number;
}

export type EpubResource = [path: string, contentType: string];

export type EpubResources = {
	[key: string]: EpubResource;
};

export type EpubMetadata = {
	[key: string]: string[];
};

export interface Epub {
	// This is the epub's record in Stump's database
	mediaEntity: Media;
	// A list of spine IDs. See https://www.w3.org/publishing/epub3/epub-ocf.html
	spine: String[];
	// A hashmap of all the resources in the epub. A resource ID maps to a tuple containing the
	// path and mime type of the resource.
	resources: EpubResources;
	// The table of contents of the epub.
	toc: EpubContent[];
	// The metadata of the epub.
	metadata: EpubMetadata;

	rootBase: string;
	rootFile: string;
	extraCss: string[];
}
