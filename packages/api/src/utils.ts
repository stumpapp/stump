import axios, { AxiosError } from 'axios'

import { CursorQueryParams, PagedQueryParams } from './types'

/** Formats a string with UrlSearchParams */
export const urlWithParams = (url: string, params?: URLSearchParams) => {
	const paramString = params?.toString()
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
 * toUrlParams({ a: 1, b: { c: 2, d: 3 } }) // a=1&b_c=2&b_d=3
 * toUrlParams({ a: [1, 2, 3] }) // a=1&a=2&a=3
 * ```
 */
export const toUrlParams = <T extends object>(
	obj?: T,
	params = new URLSearchParams(),
	prefix?: string,
) => {
	if (!obj) {
		return params
	}

	const getStringValue = (value: unknown) => {
		return String(value)
	}

	let newParams: URLSearchParams = params
	Object.keys(obj).forEach((key) => {
		const value = obj[key as keyof T]

		if (value == null) {
			// continue
			return
		}

		const isArray = Array.isArray(value)
		const isObject = typeof value === 'object' && !isArray

		if (isObject) {
			if (prefix) {
				newParams = toUrlParams(value, newParams, `${prefix}_${key}`)
			} else {
				newParams = toUrlParams(value, newParams, key)
			}
		} else if (isArray) {
			value.forEach((item) => {
				// const subItemIsArray = Array.isArray(item)
				// const subItemIsObject = typeof item === 'object' && !subItemIsArray
				// FIXME: I have a feeling this is not 100% correct, but until I add some sort of
				// unit testing I'll leave it like this. I imagine something like nested arrays
				// or objects will not work as expected? mostly with the prefix logic...
				if (typeof item === 'object') {
					newParams = toUrlParams(item, newParams)
				} else {
					newParams.append(key, item)
				}
			})
		} else if (prefix) {
			newParams.append(`${prefix}_${key}`, getStringValue(value))
		} else {
			newParams.append(key, getStringValue(value))
		}
	})

	return newParams
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
