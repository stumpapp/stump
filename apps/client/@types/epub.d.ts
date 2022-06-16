interface EpubContent {
	label: string;
	content: string;
	playOrder: number;
}

type EpubResource = [path: string, contentType: string];

type EpubResources = {
	[key: string]: EpubResource;
};

type EpubMetadata = {
	[key: string]: string[];
};

interface Epub {
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
