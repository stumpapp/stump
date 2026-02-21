import { useSDK } from '@stump/client'
import { OPDSEntryBelongsTo, OPDSLink, OPDSMetadata, OPDSPublication, resolveUrl } from '@stump/sdk'
import dayjs from 'dayjs'
import get from 'lodash/get'
import { useCallback } from 'react'
import { stringMd5 } from 'react-native-quick-md5'
import { match, P } from 'ts-pattern'
import { z } from 'zod'

const CANTOOK_PROGRESSION_REL = 'http://www.cantook.com/api/progression'
const READIUM_PROGRESSION_TYPE = 'application/vnd.readium.progression+json'

const flexibleStringValue = z.string()

const flexibleArrayValue = z.array(z.string())

const flexibleObjectArrayValue = z.array(
	z.object({
		name: z.string(), // We can't predict all the keys in the world but name feels pretty safe, Codex uses this format for credits
	}),
)

const flexibleMetadataValue = z.union([
	flexibleStringValue,
	flexibleArrayValue,
	flexibleObjectArrayValue,
])

type FlexibleMetadataValue = z.infer<typeof flexibleMetadataValue>

export type OPDSMetadataLinkableItem = {
	label: string
	links?: OPDSLink[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null

const getLanguageMapText = (value: unknown): string | null => {
	if (typeof value === 'string') return value

	if (!isRecord(value)) return null

	// FIXME: This is a complicated problem. Once the mobile app is hooked up to actual i18n then I think
	// we would pull that in here to determine what we can pull. Until then, I'm just going to try and pull
	// english values out if they exist, then fallback to the first value in the map. So...
	// TODO(localization): Pull in the app's current locale and try to match that first

	const english = ['en', 'en-US', 'en-GB']
	for (const key of english) {
		const candidate = value[key]
		if (typeof candidate === 'string' && candidate.trim()) {
			return candidate.trim()
		}
	}

	for (const candidate of Object.values(value)) {
		if (typeof candidate === 'string' && candidate.trim()) {
			return candidate.trim()
		}
	}

	return null
}

const asLinkableObject = (value: unknown): OPDSMetadataLinkableItem | null => {
	if (!isRecord(value)) return null

	const label =
		getLanguageMapText(value.name) ||
		getLanguageMapText(value.title) ||
		(typeof value.identifier === 'string' ? value.identifier : null)

	if (!label) return null

	const links = Array.isArray(value.links) ? (value.links as OPDSLink[]) : undefined

	return {
		label,
		links,
	}
}

export const getLinkableMetadataArrayField = (
	meta: OPDSMetadata | null | undefined,
	key: string,
): OPDSMetadataLinkableItem[] => {
	if (!meta) return []

	const value = get(meta, key)
	if (value == null) return []

	if (typeof value === 'string') {
		return [{ label: value.trim() }]
	}

	if (Array.isArray(value)) {
		return value
			.flatMap((entry) => {
				if (typeof entry === 'string') {
					return [{ label: entry.trim() }]
				}
				const mapped = asLinkableObject(entry)
				return mapped ? [mapped] : []
			})
			.filter((entry) => entry.label.trim().length > 0)
	}

	const mapped = asLinkableObject(value)
	return mapped ? [mapped] : []
}

/**
 * Normalizes a flexible metadata value into an array of strings
 */
export const normalizeToStringArray = (value: unknown): string[] => {
	const parsed = flexibleMetadataValue.safeParse(value)
	if (!parsed.success) {
		return []
	}

	return match(parsed.data as FlexibleMetadataValue)
		.with(P.string, (str) =>
			str
				.split(/[,;]/)
				.map((s) => s.trim())
				.filter(Boolean),
		)
		.with(P.array(P.string), (arr) => arr)
		.with(P.array({ name: P.string }), (arr) => arr.map((obj) => obj.name))
		.exhaustive()
}

export const getFlexibleArrayField = (
	meta: OPDSMetadata | null | undefined,
	key: string,
): string[] => {
	const linkedItems = getLinkableMetadataArrayField(meta, key)
	if (linkedItems.length > 0) {
		return linkedItems.map((item) => item.label)
	}

	if (!meta) return []
	const value = get(meta, key)
	return normalizeToStringArray(value)
}

type CreditFieldDefinition = {
	keys: string[]
	label: string
}

export const CREDIT_FIELD_DEFINITIONS: CreditFieldDefinition[] = [
	{ keys: ['author', 'authors'], label: 'Authors' },
	{ keys: ['writer', 'writers'], label: 'Writers' },
	{ keys: ['artist', 'artists'], label: 'Artists' },
	{ keys: ['penciler', 'pencilers'], label: 'Pencilers' },
	{ keys: ['inker', 'inkers'], label: 'Inkers' },
	{ keys: ['colorist', 'colorists'], label: 'Colorists' },
	{ keys: ['letterer', 'letterers'], label: 'Letterers' },
	{ keys: ['coverArtist', 'coverArtists'], label: 'Cover Artists' },
	{ keys: ['editor', 'editors'], label: 'Editors' },
	{ keys: ['translator', 'translators'], label: 'Translators' },
	{ keys: ['contributor', 'contributors'], label: 'Contributors' },
	{ keys: ['illustrator', 'illustrators'], label: 'Illustrators' },
	{ keys: ['narrator', 'narrators'], label: 'Narrators' },
]

export type ExtractedCredit = {
	label: string
	items: OPDSMetadataLinkableItem[]
}

export const extractCredits = (meta: OPDSMetadata | null | undefined): ExtractedCredit[] => {
	if (!meta) return []

	const credits: ExtractedCredit[] = []

	for (const definition of CREDIT_FIELD_DEFINITIONS) {
		const allItems: OPDSMetadataLinkableItem[] = []

		for (const key of definition.keys) {
			const items = getLinkableMetadataArrayField(meta, key)
			allItems.push(...items)
		}

		const uniqueItems = Array.from(
			allItems.reduce((acc, item) => {
				if (!acc.has(item.label)) {
					acc.set(item.label, item)
				}
				return acc
			}, new Map<string, OPDSMetadataLinkableItem>()),
		).map(([, item]) => item)

		if (uniqueItems.length > 0) {
			credits.push({
				label: definition.label,
				items: uniqueItems,
			})
		}
	}

	return credits
}

export const getBelongsToPosition = (
	belongsTo: OPDSEntryBelongsTo | null | undefined,
	field: 'series' | 'collection',
) => {
	const value = get(belongsTo, field)
	if (Array.isArray(value)) {
		return value[0]?.position ?? null
	}
	return value?.position ?? null
}

export const getNumberField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'number' ? value : null
}

export const getStringField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	return typeof value === 'string' ? value : null
}

export const getSelfLink = (links?: OPDSLink[] | null) =>
	links?.find((link) => !!link?.href && link.rel === 'self')

export const getFirstSubsectionLink = (links?: OPDSLink[] | null) =>
	links?.find((link) => !!link?.href && link.rel === 'subsection')

// TODO: I added this for now mostly for contributor links but def requires more testing
export const getFirstLink = (links?: OPDSLink[] | null) => links?.find((link) => !!link?.href)

export const getDateField = (meta: OPDSMetadata, key: string) => {
	const value = get(meta, key)
	const _dayjs = dayjs(typeof value === 'string' ? value : null)
	return _dayjs.isValid() ? _dayjs : null
}

export const getLanguages = (meta: OPDSMetadata): string[] => {
	const languageValue = meta.language
	if (typeof languageValue === 'string') {
		return [languageValue]
	} else if (Array.isArray(languageValue)) {
		return languageValue
	}
	return []
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
