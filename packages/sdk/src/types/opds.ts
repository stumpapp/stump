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

// See https://readium.org/webpub-manifest/schema/language-map.schema.json
const languageMap = z.union([
	z.string(),
	z.record(
		z
			.string()
			.regex(
				/^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse2>x(-[A-Za-z0-9]{1,8})+))$/,
			),
	),
])

// See https://readium.org/webpub-manifest/schema/altIdentifier.schema.json
const altIdentifier = z.union([
	z.string(),
	z.object({
		value: z.string(),
		scheme: z.string().nullish(),
	}),
])

const contributorObject = z.object({
	name: languageMap,
	identifier: z.string().nullish(),
	altIdentifier: altIdentifier.nullish(),
	// TODO: sortAs: languageMap.nullish(),??
	role: z.union([z.string(), z.array(z.string())]).nullish(),
	links: z.array(link).nullish(),
})

const contributor = z.union([
	z.string(),
	z.array(z.string()),
	contributorObject,
	z.array(z.union([z.string(), contributorObject])),
])
export type OPDSContributor = z.infer<typeof contributor>

const subjectObject = z.object({
	name: languageMap,
	// TODO: sortAs: languageMap.nullish(),??
	code: z.string().nullish(),
	scheme: z.string().nullish(),
	links: z.array(link).nullish(),
})

// See https://readium.org/webpub-manifest/schema/subject.schema.json
const subject = z.union([
	z.string(),
	z.array(z.string()),
	subjectObject,
	z.array(z.union([z.string(), subjectObject])),
])
export type OPDSSubject = z.infer<typeof subject>

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

const belongsToObject = z.object({
	name: z.string(),
	position: z.number().nullish(),
	links: z.array(link).default([]),
})

// https://readium.org/webpub-manifest/schema/metadata.schema.json -> belongsTo
const belongsTo = z.object({
	series: z.union([belongsToObject, z.array(belongsToObject)]).nullish(),
	collection: z.union([belongsToObject, z.array(belongsToObject)]).nullish(),
})
export type OPDSEntryBelongsTo = z.infer<typeof belongsTo>

export type OPDSDynamicMetadata = Record<string, unknown>
// See https://readium.org/webpub-manifest/schema/metadata.schema.json
const metadata = z
	.object({
		title: z.string(),
		subtitle: z.string().nullish(),
		identifier: z.string().nullish(),
		published: z.string().nullish(),
		modified: z.string().nullish(),
		description: z.string().nullish(),
		language: z.union([z.string(), z.array(z.string())]).nullish(),
		readingDirection: z.union([z.literal('rtl'), z.literal('ltr')]).nullish(),
		numberOfPages: z.number().nullish(),
		volume: z.number().nullish(),
		issue: z.number().nullish(),
		belongsTo: belongsTo.nullish(),
		author: contributor.nullish(),
		translator: contributor.nullish(),
		editor: contributor.nullish(),
		artist: contributor.nullish(),
		illustrator: contributor.nullish(),
		letterer: contributor.nullish(),
		penciler: contributor.nullish(),
		colorist: contributor.nullish(),
		inker: contributor.nullish(),
		narrator: contributor.nullish(),
		contributor: contributor.nullish(),
		publisher: contributor.nullish(),
		imprint: contributor.nullish(),
		subject: subject.nullish(),
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
	position: z.number().nullish(),
	progression: z.number().nullish(),
	totalProgression: z.number().nullish(),
})

const progressionLocator = z.object({
	title: z.string().nullish(),
	href: z.string().nullish(),
	type: z.string().nullish(),
	locations: progessionLocation.nullish(),
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

const progressionLocationInput = z.object({
	fragments: z.array(z.string()).optional(),
	position: z.number().optional(),
	progression: z.number().optional(),
	totalProgression: z.number().optional(),
})

const progressionTextInput = z.object({
	before: z.string().optional(),
	highlight: z.string().optional(),
	after: z.string().optional(),
})

const progressionLocatorInput = z.object({
	href: z.string(),
	type: z.string(),
	title: z.string().optional(),
	locations: progressionLocationInput.optional(),
	text: progressionTextInput.optional(),
})

const progressionDeviceInput = z.object({
	id: z.string(),
	name: z.string(),
})

export const progressionInput = z.object({
	modified: z.string(),
	device: progressionDeviceInput,
	locator: progressionLocatorInput,
})
export type OPDSProgressionInput = z.infer<typeof progressionInput>

const feedGroup = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	publications: z.array(publication).default([]),
	metadata,
})
export type OPDSFeedGroup = z.infer<typeof feedGroup>

export type OPDSFeed = {
	links: OPDSLink[]
	navigation: OPDSNavigationLink[]
	groups: OPDSFeedGroup[]
	publications: OPDSPublication[]
	metadata: OPDSMetadata
}

// Note: This officially became too complex of a type for inference,
// so I cast it manually
export const feedSchema = z.object({
	links: z.array(link).default([]),
	navigation: z.array(navigationLink).default([]),
	groups: z.array(feedGroup).default([]),
	publications: z.array(publication).default([]),
	metadata,
}) as z.ZodType<OPDSFeed>
