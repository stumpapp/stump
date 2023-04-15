import { epubApi } from '@stump/api'
import type { Epub, EpubContent } from '@stump/types'
import { useMemo, useState } from 'react'

import { useQuery } from '../client'

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
	const [chapter] = useState(2)

	const { isLoading: isFetchingBook, data: epub } = useQuery(
		['getEpubById', id],
		() => epubApi.getEpubById(id).then((res) => res.data),
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
				`src="${epubApi.getEpubBaseUrl(id)}/${epub?.root_base ?? ''}/`,
			)
			corrected = corrected.replace(entry, src)
		})

		const invlalidHrefs = corrected.match(/href="[^"]+"/g)

		invlalidHrefs?.forEach((entry) => {
			const href = entry.replace(
				'href="',
				`href="${epubApi.getEpubBaseUrl(id)}/${epub?.root_base ?? ''}/`,
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

// FIXME: use options
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useEpubLazy(id: string, _options?: EpubOptions) {
	const {
		data: epub,
		isLoading,
		isRefetching,
		isFetching,
	} = useQuery(['getEpubById', id], () => epubApi.getEpubById(id).then((res) => res.data))

	return {
		epub,
		isLoading: isLoading || isRefetching || isFetching,
	}
}
