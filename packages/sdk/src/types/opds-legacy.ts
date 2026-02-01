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
	])
	.or(
		z.string().refine((val) => val.startsWith('image/'), { message: 'Must be a valid MIME type' }),
	)

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
])

const linkSchema = z.object({
	href: z.string(),
	title: z.string().nullish(),
	type: linkType.nullish(),
	rel: linkRel.nullish(),
})
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

export const feedSchema = z
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
export type OPDSLegacyFeed = z.infer<typeof feedSchema>
