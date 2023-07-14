import axios, { AxiosError } from 'axios'
import qs from 'qs'

import { CursorQueryParams, PagedQueryParams } from './types'

/** Formats a string with UrlSearchParams */
export const urlWithParams = (url: string, params?: URLSearchParams) => {
	const paramString = decodeURIComponent(params?.toString() || '')
	if (paramString?.length) {
		return `${url}?${paramString}`
	}
	return url
}

/**
 * Convert an object to `UrlSearchParams`. Will work for deeply nested objects, as well as arrays.
 *
 * @example
 * ```ts
 * toUrlParams({ a: 1, b: { c: 2, d: 3 } }) // a=1&b[c]=2&b[d]=3
 * toUrlParams({ a: [1, 2, 3] }) // a[]=1&a[]=2&a[]=3
 * toUrlParams({ a: 1, b: { c: [1, 2, 3], d: 3 } }) // a=1&b[c][]=1&b[c][]=2&b[c][]=3&b[d]=3
 * toUrlParams({ a: [1], b: { c: [1, 2, 3], d: 3 } }) // a[]=1&b[c][]=1&b[c][]=2&b[c][]=3&b[d]=3
 * ```
 */
export const toUrlParams = <T extends object>(obj?: T, params = new URLSearchParams()) => {
	if (!obj) {
		return params
	}

	return new URLSearchParams(qs.stringify(obj, { arrayFormat: 'brackets' }))
}

export const mergeCursorParams = ({
	afterId,
	limit,
	params,
}: CursorQueryParams): URLSearchParams => {
	const searchParams = new URLSearchParams(params)
	if (afterId) {
		searchParams.set('cursor', afterId)
	}
	if (limit) {
		searchParams.set('limit', limit.toString())
	}
	return searchParams
}

export const mergePageParams = ({ page, page_size, params }: PagedQueryParams): URLSearchParams => {
	const searchParams = new URLSearchParams(params)
	if (page) {
		searchParams.set('page', page.toString())
	}
	if (page_size) {
		searchParams.set('page_size', page_size.toString())
	}
	return searchParams
}

export const isAxiosError = (error: unknown): error is AxiosError => {
	return axios.isAxiosError(error)
}
