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
		'application/x-rar-compressed',
		'application/vnd.rar',
	])
	.or(z.string()) // no real need to be stricter here

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
	'http://opds-spec.org/acquisition/open-access', // open access acquisition
])

export const isPseStreamLink = (link: OPDSLegacyLink) =>
	link.rel === 'http://vaemendis.net/opds-pse/stream'

const intoValidNumber = (value: string | number) => {
	if (typeof value === 'number') return value
	const parsed = parseInt(value, 10)
	return isNaN(parsed) ? null : parsed
}

const resolveCountFromLink = (
	pseCount?: string | number | null,
	p5Count?: string | number | null,
) => {
	if (pseCount != null) {
		return intoValidNumber(pseCount) ?? undefined
	}
	if (p5Count != null) {
		return intoValidNumber(p5Count) ?? undefined
	}
	return undefined
}

const linkSchema = z
	.object({
		href: z.string(),
		title: z.string().nullish(),
		type: linkType.nullish(),
		rel: linkRel.nullish(),
		'pse:count': z.union([z.string(), z.number()]).nullish(),
		'p5:count': z.union([z.string(), z.number()]).nullish(), // Kavita uses this
		'pse:lastRead': z.union([z.string(), z.number()]).nullish(),
		'pse:lastReadDate': z.string().nullish(),
	})
	.transform((obj) => ({
		...obj,
		'pse:count': resolveCountFromLink(obj['pse:count'], obj['p5:count']),
		'pse:lastRead':
			typeof obj['pse:lastRead'] === 'string'
				? intoValidNumber(obj['pse:lastRead'])
				: (obj['pse:lastRead'] ?? undefined),
	}))
export type OPDSLegacyLink = z.infer<typeof linkSchema>

const entryAuthor = z.object({
	name: z.string(),
	uri: z.string().nullish(),
})
export type OPDSLegacyEntryAuthor = z.infer<typeof entryAuthor>

const contentSchema = z
	.union([
		z.string(),
		z.object({
			'#text': z.string(),
			type: z.string().nullish(),
		}),
	])
	.transform((val) => (typeof val === 'string' ? val : val['#text']))

const idSchema = z.union([z.string(), z.number()]).transform((val) => val.toString())

const entry = z
	.object({
		id: idSchema,
		title: z.string(),
		updated: z.string().nullish(),
		content: contentSchema.nullish(),
		link: z.union([linkSchema, z.array(linkSchema)]).default([]),
		author: z.union([entryAuthor, z.array(entryAuthor)]).default([]),
	})
	.transform((obj) => ({
		...omit(obj, ['link', 'author']),
		links: Array.isArray(obj.link) ? obj.link : [obj.link],
		authors: Array.isArray(obj.author) ? obj.author : [obj.author],
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
