import { z } from 'zod'

export type OPDSLinkType = string

const baseLink = z.object({
	title: z.string().optional(),
	rel: z.union([z.string(), z.array(z.string())]).optional(),
	href: z.string(),
	type: z.string().optional(),
	templated: z.boolean().optional(),
	properties: z.record(z.unknown()).optional(),
})
export type OPDSBaseLink = z.infer<typeof baseLink>

const navigationLink = z
	.object({
		title: z.string(),
	})
	.and(baseLink)
export type OPDSNavigationLink = z.infer<typeof navigationLink>

const imageLink = z
	.object({
		width: z.number().optional(),
		height: z.number().optional(),
	})
	.and(baseLink)

const link = z.union([baseLink, navigationLink, imageLink])
export type OPDSLink = z.infer<typeof link>

const authFlow = z.object({
	type: z.literal('http://opds-spec.org/auth/basic'),
})

// OPDSAuthenticationDocument
export const authDocument = z.object({
	id: z.string(),
	authentication: z.array(authFlow),
	title: z.string(),
	description: z.string().optional(),
	links: z.array(link).default([]),
})
export type OPDSAuthenticationDocument = z.infer<typeof authDocument>

const paginationMeta = z.object({
	numberOfItems: z.number().optional(),
	itemsPerPage: z.number().optional(),
	currentPage: z.number().optional(),
})
export type OPDSPaginationMetadata = z.infer<typeof paginationMeta>

const belongsTo = z.object({
	series: z
		.object({
			name: z.string(),
			position: z.number().optional(),
			links: z.array(link).default([]),
		})
		.optional(),
})
export type OPDSEntryBelongsTo = z.infer<typeof belongsTo>

export type OPDSDynamicMetadata = Record<string, unknown>
const metadata = z
	.object({
		title: z.string(),
		identifier: z.string().optional(),
		modified: z.string().optional(),
		description: z.string().optional(),
		belongsTo: belongsTo.optional(),
	})
	.merge(paginationMeta)
	.and(z.record(z.unknown()))
	.transform((data) => {
		if (data.title.match(/\.[a-z0-9]+$/)) {
			data.title = data.title.replace(/\.[a-z0-9]+$/, '')
		}
		return data
	})
export type OPDSMetadata = z.infer<typeof metadata>

export const publication = z.object({
	context: z.string(),
	metadata: metadata,
	links: z.array(link).optional(),
	images: z.array(imageLink).optional(),
	readingOrder: z.array(imageLink).optional(),
	resources: z.array(link).optional(),
	toc: z.array(link).optional(),
	landmarks: z.array(link).optional(),
	pageList: z.array(link).optional(),
})
export type OPDSPublication = z.infer<typeof publication>

const feedGroup = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	publications: z.array(publication).default([]),
	metadata,
})
export type OPDSFeedGroup = z.infer<typeof feedGroup>

export const feedSchema = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	groups: z.array(feedGroup).default([]),
	publications: z.array(publication).default([]),
	metadata,
})
export type OPDSFeed = z.infer<typeof feedSchema>
