import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { getEpubBaseUrl, getEpubById } from '~api/query/epub';

export interface EpubOptions {
	loc?: string;
}

export interface EpubActions {
	currentResource(): EpubContent | undefined;
	// hasNext(): boolean;
	// hasPrev(): boolean;
	// next(): void;
	// prev(): void;
}

export interface UseEpubReturn {
	epub: Epub;
	isFetchingBook: boolean;
	actions: EpubActions;
	correctHtmlUrls: (html: string) => string;
}

export function useEpub(id: string, options?: EpubOptions) {
	const [chapter, setChapter] = useState(2);

	const { isLoading: isFetchingBook, data: epub } = useQuery(['getEpubById', id], {
		queryFn: () => getEpubById(id).then((res) => res.data),
	});

	const actions = useMemo(
		() => ({
			currentResource() {
				return epub?.toc.find((item) => item.playOrder === chapter);
			},
			hasNext() {},
			hasPrevious() {},
			next() {},
			previous() {},
		}),
		[epub],
	);

	function correctHtmlUrls(html: string): string {
		// replace all src attributes with `{epubBaseURl}/{root}/{src}`
		// replace all href attributes with `{epubBaseURl}/{root}/{href}`
		let corrected = html;

		const invalidSources = corrected.match(/src="[^"]+"/g);

		invalidSources?.forEach((entry) => {
			const src = entry.replace('src="', `src="${getEpubBaseUrl(id)}/${epub?.rootBase ?? ''}/`);
			corrected = corrected.replace(entry, src);
		});

		const invlalidHrefs = corrected.match(/href="[^"]+"/g);

		invlalidHrefs?.forEach((entry) => {
			const href = entry.replace('href="', `href="${getEpubBaseUrl(id)}/${epub?.rootBase ?? ''}/`);
			corrected = corrected.replace(entry, href);
		});

		return corrected;
	}

	return {
		isFetchingBook,
		epub,
		actions,
		correctHtmlUrls,
	} as UseEpubReturn;
}
