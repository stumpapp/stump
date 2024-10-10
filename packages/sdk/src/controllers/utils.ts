import { APIError } from '../types'
import axios, { AxiosError } from 'axios'
import qs from 'qs'

import { CursorQueryParams, PagedQueryParams } from './types'

export const createRouteURLHandler =
	(baseURL: string) => (endpoint: string, params?: Record<string, unknown>) => {
		let adjustedParams: Record<string, unknown> | undefined = undefined

		if (!!params && 'params' in params && typeof params.params === 'object') {
			const innerParams = params.params
			delete params.params
			adjustedParams = { ...params, ...innerParams }
		} else {
			adjustedParams = params
		}

		return urlWithParams(
			`${baseURL}${!endpoint.length || endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
			toUrlParams(adjustedParams),
		)
	}

/** Formats a string with UrlSearchParams */
export const urlWithParams = (url: string, params?: URLSearchParams) => {
	// NOTE: it is important to decode the params because qs.stringify will encode them
	// EVEN WITH the encode: false option set >:(
	const paramString = decodeURIComponent(params?.toString() || '')
	if (paramString?.length) {
		return `${url}?${paramString}`
	}
	return url
}

type ToUrlParamsOptions = {
	removeEmpty?: boolean
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
export const toUrlParams = <T extends object>(
	obj?: T,
	params = new URLSearchParams(),
	{ removeEmpty }: ToUrlParamsOptions = {},
) => {
	if (!obj) {
		return params
	}

	return new URLSearchParams(
		qs.stringify(obj, { arrayFormat: 'brackets', encode: false, skipNulls: removeEmpty }),
	)
}

/**
 * A wrapper around `toUrlParams` that returns a decoded string.
 */
export const toUrlParamsString = <T extends object>(
	obj?: T,
	params = new URLSearchParams(),
	options: ToUrlParamsOptions = {},
) => {
	return decodeURIComponent(toUrlParams(obj, params, options).toString())
}

type ToObjectParamsOptions = {
	ignoreKeys?: string[]
	removeEmpty?: boolean
}
export const toObjectParams = <T extends object>(
	params?: URLSearchParams,
	{ ignoreKeys, removeEmpty }: ToObjectParamsOptions = {},
): T => {
	if (!params) {
		return {} as T
	}

	const newParams = new URLSearchParams(params.toString())

	for (const key of ignoreKeys || []) {
		newParams.delete(key)
	}

	if (removeEmpty) {
		for (const [key, value] of newParams.entries()) {
			if (!value) {
				newParams.delete(key)
			}
		}
	}

	return qs.parse(newParams.toString(), { ignoreQueryPrefix: true }) as T
}

export const mergeCursorParams = ({
	afterId,
	limit,
	params,
}: CursorQueryParams): URLSearchParams => {
	const searchParams = toUrlParams(params)
	if (afterId) {
		searchParams.set('cursor', afterId)
	}
	if (limit) {
		searchParams.set('limit', limit.toString())
	}
	return searchParams
}

export const mergePageParams = ({ page, page_size, params }: PagedQueryParams): URLSearchParams => {
	const searchParams = toUrlParams(params)
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

export const isAPIError = (data: unknown): data is APIError => {
	return (data as APIError).code !== undefined && (data as APIError).details !== undefined
}

export const handleApiError = (error: unknown, fallback?: string): string => {
	const fallbackMessage = fallback || 'Something went wrong.'

	if (isAxiosError(error)) {
		return isAPIError(error.response?.data) ? error.response?.data.details : fallbackMessage
	} else if (error instanceof Error) {
		return error.message || fallbackMessage
	} else {
		return fallbackMessage
	}
}
