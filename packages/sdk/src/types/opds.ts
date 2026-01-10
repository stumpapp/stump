import { z } from 'zod'

export type OPDSLinkType = string

const baseLink = z.object({
	title: z.string().nullish(),
	rel: z.union([z.string(), z.array(z.string())]).nullish(),
	href: z.string(),
	type: z.string().nullish(),
	templated: z.boolean().nullish(),
	properties: z.record(z.unknown()).nullish(),
})
export type OPDSBaseLink = z.infer<typeof baseLink>

const navigationLink = z
	.object({
		// Codex doesn't guarantee this field, but it is required by the spec.
		// See https://drafts.opds.io/opds-2.0.html#21-navigation
		title: z.string().default('Navigation Link'),
	})
	.and(baseLink)
export type OPDSNavigationLink = z.infer<typeof navigationLink>

const imageLink = z
	.object({
		width: z.number().nullish(),
		height: z.number().nullish(),
	})
	.and(baseLink)

const link = z.union([baseLink, navigationLink, imageLink])
export type OPDSLink = z.infer<typeof link>

const authFlow = z
	.object({
		type: z.literal('http://opds-spec.org/auth/basic'),
	})
	.and(
		z.object({
			labels: z
				.object({
					login: z.string().nullish(),
					password: z.string().nullish(),
				})
				.nullish(),
		}),
	)

// OPDSAuthenticationDocument
export const authDocument = z.object({
	id: z.string(),
	authentication: z.array(authFlow),
	title: z.string(),
	description: z.string().nullish(),
	links: z.array(link).default([]),
})
export type OPDSAuthenticationDocument = z.infer<typeof authDocument>

const paginationMeta = z.object({
	numberOfItems: z.number().nullish(),
	itemsPerPage: z.number().nullish(),
	currentPage: z.number().nullish(),
})
export type OPDSPaginationMetadata = z.infer<typeof paginationMeta>

const belongsToSeries = z.object({
	name: z.string(),
	position: z.number().nullish(),
	links: z.array(link).default([]),
})

// Komga sends series as an array, Stump doesnt
const belongsTo = z.object({
	series: z.union([belongsToSeries, z.array(belongsToSeries)]).nullish(),
})
export type OPDSEntryBelongsTo = z.infer<typeof belongsTo>

export type OPDSDynamicMetadata = Record<string, unknown>
const metadata = z
	.object({
		title: z.string(),
		identifier: z.string().nullish(),
		modified: z.string().nullish(),
		description: z.string().nullish(),
		belongsTo: belongsTo.nullish(),
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
	context: z.string().nullish(), // Codex doesn't guarantee this field
	metadata: metadata,
	links: z.array(link).nullish(),
	images: z.array(imageLink).nullish(),
	readingOrder: z.array(imageLink).nullish(),
	resources: z.array(link).nullish(),
	toc: z.array(link).nullish(),
	landmarks: z.array(link).nullish(),
	pageList: z.array(link).nullish(),
})
export type OPDSPublication = z.infer<typeof publication>

const progessionLocation = z.object({
	fragments: z.array(z.string()).nullish(),
	position: z.string().nullish(),
	progression: z.number().nullish(),
	totalProgression: z.number().nullish(),
})

const progressionLocator = z.object({
	title: z.string().nullish(),
	href: z.string().nullish(),
	type: z.string().nullish(),
	locations: z.array(progessionLocation).nullish(),
})

const progressionDevice = z.object({
	id: z.string(),
	name: z.string(),
})

export const progression = z
	.object({
		modified: z.string(),
		device: progressionDevice.nullish(),
		locator: progressionLocator,
	})
	.transform((data) => ({
		...data,
		modified: new Date(data.modified),
	}))
export type OPDSProgression = z.infer<typeof progression>

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
