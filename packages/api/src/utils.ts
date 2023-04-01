import { CursorQueryParams } from './types'

/** Formats a string with UrlSearchParams */
export const urlWithParams = (url: string, params?: URLSearchParams) => {
	const paramString = params?.toString()
	if (paramString?.length) {
		return `${url}?${paramString}`
	}
	return url
}

/** Convert an object to `UrlSearchParams`. Will work for deeply nested objects, as well. */
export const toUrlParams = <T extends object>(
	obj: T,
	params = new URLSearchParams(),
	prefix?: string,
) => {
	Object.entries(obj).forEach(([key, value]) => {
		if (value !== null && typeof value === 'object') {
			if (prefix) {
				toUrlParams(value, params, `${prefix}_${key}`)
			} else {
				toUrlParams(value, params, key)
			}
		} else if (prefix) {
			params.append(`${prefix}_${key}`, value)
		} else {
			params.append(key, value)
		}
	})

	return params
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
