import type { Epub, EpubContent } from '@stump/sdk'
import { useMemo, useState } from 'react'

import { useQuery } from '../client'
import { useSDK } from '../sdk'

export interface EpubOptions {
	// loc is the epubcfi, comes from the query param ?loc=epubcfi(..)
	loc: string | null
}

export interface EpubActions {
	currentResource(): EpubContent | undefined
	// hasNext(): boolean;
	// hasPrev(): boolean;
	// next(): void;
	// prev(): void;
}

export interface UseEpubReturn {
	epub: Epub
	isFetchingBook: boolean
	actions: EpubActions
	correctHtmlUrls: (html: string) => string
}

// TODO: I need to decide how to navigate epub streaming. I can go the cheap route and
// use chapters, but even that has layers of complexity:
// - server-side chapters will handle to resource link fixes for me, but will make anchor tag navigation difficult
// - client-side might be easier, but I'd rather not have heavier client-side computations for *large* epub files
// I can use epubcfi to navigate, but that makes me want to throw up lol i mean just look at this syntax:
// epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10) -> wtf is that lmao

// FIXME: use options

export function useEpub(id: string, _options?: EpubOptions, enabled?: boolean) {
	const { sdk } = useSDK()
	const [chapter] = useState(2)

	const { isLoading: isFetchingBook, data: epub } = useQuery(
		[sdk.epub.keys.getByID, id],
		() => sdk.epub.getByID(id),
		{
			enabled,
		},
	)

	const actions = useMemo(
		() => ({
			currentResource() {
				return epub?.toc.find((item) => item.play_order === chapter)
			},
			hasNext() {
				// TODO: make me
			},
			hasPrevious() {
				// TODO: make me
			},
			next() {
				// TODO: make me
			},
			previous() {
				// TODO: make me
			},
		}),
		[epub, chapter],
	)

	function correctHtmlUrls(html: string): string {
		// replace all src attributes with `{epubBaseURl}/{root}/{src}`
		// replace all href attributes with `{epubBaseURl}/{root}/{href}`
		let corrected = html

		const invalidSources = corrected.match(/src="[^"]+"/g)

		invalidSources?.forEach((entry) => {
			const src = entry.replace(
				'src="',
				`src="${sdk.epub.epubServiceURL(id)}/${epub?.root_base ?? ''}/`,
			)
			corrected = corrected.replace(entry, src)
		})

		const invalidHrefs = corrected.match(/href="[^"]+"/g)

		invalidHrefs?.forEach((entry) => {
			const href = entry.replace(
				'href="',
				`href="${sdk.epub.epubServiceURL(id)}/${epub?.root_base ?? ''}/`,
			)
			corrected = corrected.replace(entry, href)
		})

		return corrected
	}

	return {
		actions,
		correctHtmlUrls,
		epub,
		isFetchingBook,
	} as UseEpubReturn
}

export function useEpubLazy(id: string) {
	const { sdk } = useSDK()
	const { data: epub, ...restReturn } = useQuery(
		[sdk.epub.keys.getByID, id],
		() => sdk.epub.getByID(id),
		{ staleTime: 0, cacheTime: 0 },
	)

	return {
		epub,
		...restReturn,
	}
}
