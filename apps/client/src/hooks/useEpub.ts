import { Epub, EpubContent } from '@stump/core';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEpubBaseUrl, getEpubById } from '~api/epub';

export interface EpubOptions {
	// loc is the epubcfi, comes from the query param ?loc=epubcfi(..)
	loc: string | null;
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

// TODO: I need to decide how to navigate epub streaming. I can go the cheap route and
// use chapters, but even that has layers of complexity:
// - server-side chapters will handle to resource link fixes for me, but will make anchor tag navigation difficult
// - client-side might be easier, but I'd rather not have heavier client-side computations for *large* epub files
// I can use epubcfi to navigate, but that makes me want to throw up lol i mean just look at this syntax:
// epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10) -> wtf is that lmao
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
