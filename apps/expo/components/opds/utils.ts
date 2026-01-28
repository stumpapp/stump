import { useSDK } from '@stump/client'
import { OPDSMetadata, OPDSPublication, resolveUrl } from '@stump/sdk'
import dayjs from 'dayjs'
import get from 'lodash/get'
import { useCallback } from 'react'
import { stringMd5 } from 'react-native-quick-md5'

const CANTOOK_PROGRESSION_REL = 'http://www.cantook.com/api/progression'
const READIUM_PROGRESSION_TYPE = 'application/vnd.readium.progression+json'

export const getNumberField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'number' ? value : null
}

export const getStringField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'string' ? value : null
}

export const getDateField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	const _dayjs = dayjs(typeof value === 'string' ? value : null)
	return _dayjs.isValid() ? _dayjs : null
}

// An identifier that can be generated from a URL to uniquely identify a publication
// without dealing with common URL issues for file names
export const hashFromURL = (url: string) => stringMd5(url)

export const extensionFromMime = (mime: string | null | undefined): string | null => {
	if (!mime) return null
	switch (mime) {
		case 'application/epub+zip':
			return 'epub'
		case 'application/pdf':
			return 'pdf'
		case 'application/zip':
		case 'application/vnd.comicbook+zip':
		case 'application/x-cbz':
			return 'cbz'
		case 'application/x-cbr':
		case 'application/vnd.comicbook-rar':
			return 'cbr'
		case 'application/x-rar-compressed':
			return 'rar'
		default:
			return null
	}
}

export const getAcquisitionLink = (links: OPDSPublication['links']) => {
	return links?.find((link) => link.rel === 'http://opds-spec.org/acquisition')
}

export const getPublicationId = (
	url: string,
	metadata: OPDSMetadata | null | undefined,
): string => {
	const identifier = metadata?.identifier
	return identifier || hashFromURL(url)
}

export const getProgressionURL = (links: OPDSPublication['links'], baseUrl?: string) => {
	const progressionLink = links?.find(
		(link) => link.rel === CANTOOK_PROGRESSION_REL || link.type === READIUM_PROGRESSION_TYPE,
	)
	if (progressionLink?.href) {
		return resolveUrl(progressionLink.href, baseUrl)
	}
}

export const getPublicationThumbnailURL = (
	{
		images,
		resources,
		readingOrder,
	}: Pick<OPDSPublication, 'images' | 'resources' | 'readingOrder'>,
	baseUrl?: string,
) => {
	const imageURL = images?.at(0)?.href
	if (imageURL) {
		return resolveUrl(imageURL, baseUrl)
	}

	const resourceURL = resources?.find(({ type }) => type?.startsWith('image'))?.href
	if (resourceURL) {
		return resolveUrl(resourceURL, baseUrl)
	}

	const readingOrderURL = readingOrder?.find(({ type }) => type?.startsWith('image'))?.href
	if (readingOrderURL) {
		return resolveUrl(readingOrderURL, baseUrl)
	}
}

export function useResolveURL() {
	const { sdk } = useSDK()
	return useCallback((url: string) => resolveUrl(url, sdk.rootURL), [sdk.rootURL])
}
