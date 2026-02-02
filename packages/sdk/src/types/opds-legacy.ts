import omit from 'lodash/omit'
import { z } from 'zod'

// https://specs.opds.io/opds-1.2#the-atomlink-element
const linkType = z
	.enum([
		'application/atom+xml;profile=opds-catalog;kind=acquisition', // acquisition
		'application/atom+xml;profile=opds-catalog;kind=navigation', // navigation
		'application/octet-stream',
		'application/zip',
		'application/epub+zip',
		'application/opensearchdescription+xml',
		'application/opds+json',
	])
	.or(
		z.string().refine((val) => val.startsWith('image/'), { message: 'Must be a valid MIME type' }),
	)

export const isLegacyNavigationLink = (link: OPDSLegacyLink) =>
	link.type === 'application/atom+xml;profile=opds-catalog;kind=navigation'

export const isLegacyDownloadableLink = (link: OPDSLegacyLink) =>
	link.rel === 'http://opds-spec.org/acquisition'

const linkRel = z.enum([
	'self',
	'subsection',
	'http://opds-spec.org/acquisition', // acquisition
	'start',
	'next',
	'previous',
	'http://opds-spec.org/image', // image
	'http://opds-spec.org/image/thumbnail', // thumbnail
	'http://vaemendis.net/opds-pse/stream', // PSE stream
	'search',
	'alternate', // e.g., link for different OPDS feed or version
])

export const isPseStreamLink = (link: OPDSLegacyLink) =>
	link.rel === 'http://vaemendis.net/opds-pse/stream'

const intoValidNumber = (value: string | number) => {
	if (typeof value === 'number') return value
	const parsed = parseInt(value, 10)
	return isNaN(parsed) ? null : parsed
}

const linkSchema = z
	.object({
		href: z.string(),
		title: z.string().nullish(),
		type: linkType.nullish(),
		rel: linkRel.nullish(),
		'pse:count': z.union([z.string(), z.number()]).nullish(),
	})
	.transform((obj) => ({
		...obj,
		'pse:count':
			typeof obj['pse:count'] === 'string'
				? intoValidNumber(obj['pse:count'])
				: (obj['pse:count'] ?? undefined),
	}))
export type OPDSLegacyLink = z.infer<typeof linkSchema>

const entry = z
	.object({
		id: z.string(),
		title: z.string(),
		updated: z.string().nullish(),
		content: z.string().nullish(),
		link: z.union([linkSchema, z.array(linkSchema)]).default([]),
	})
	.transform((obj) => ({
		...omit(obj, ['link']),
		links: Array.isArray(obj.link) ? obj.link : [obj.link],
	}))
export type OPDSLegacyEntry = z.infer<typeof entry>

const feedAuthor = z.object({
	name: z.string(),
	uri: z.string().nullish(),
})
export type OPDSLegacyFeedAuthor = z.infer<typeof feedAuthor>

export const legacyFeed = z
	.object({
		id: z.string(),
		title: z.string(),
		author: feedAuthor.nullish(),
		link: z.union([linkSchema, z.array(linkSchema)]).default([]),
		entry: z.union([entry, z.array(entry)]).default([]),
	})
	.transform((obj) => ({
		...omit(obj, ['link', 'entry']),
		links: Array.isArray(obj.link) ? obj.link : [obj.link],
		entries: Array.isArray(obj.entry) ? obj.entry : [obj.entry],
	}))
export type OPDSLegacyFeed = z.infer<typeof legacyFeed>

const openSearchUrl = z.object({
	type: z.string(),
	template: z.string(),
})

export const openSearchDoc = z
	.object({
		ShortName: z.string(),
		Description: z.string(),
		Url: z.union([openSearchUrl, z.array(openSearchUrl)]),
	})
	.transform((obj) => ({
		// Note: Honestly I did not check the spec for whether multiple URLs are allowed, but just anticipate
		// funk from different implementations
		...omit(obj, ['Url']),
		Urls: Array.isArray(obj.Url) ? obj.Url : [obj.Url],
	}))
export type OPDSLegacyOpenSearchDoc = z.infer<typeof openSearchDoc>
