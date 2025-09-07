import { PickSelect } from '@stump/components'
import {
	CreateLibrarySceneExistingLibrariesQuery,
	LibraryConfigInput,
	LibraryPattern,
	LibrarySettingsConfigFragment,
	ReadingDirection,
	ReadingImageScaleFit,
	ReadingMode,
	ScaledDimensionResize,
	SupportedImageFormat,
} from '@stump/graphql'
import isValidGlob from 'is-valid-glob'
import omit from 'lodash/omit'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { ILibraryContext } from '@/scenes/library/context'

type Library = ILibraryContext['library']

/**
 * A type guard to check if the input is a valid {@link LibraryPattern}
 */
const isLibraryPattern = (input: string): input is LibraryPattern => {
	return input === LibraryPattern.SeriesBased || input === LibraryPattern.CollectionBased
}

/**
 * A helper function to convert persisted ignore rules to the form format
 */
export const toFormIgnoreRules = (ignoreRules: string[] = []) =>
	ignoreRules.map((rule) => ({
		glob: rule,
		ignore_parents: rule.match(/\/\*$/) !== null,
		ignore_subdirs: rule.match(/\*\/$/) !== null,
	}))

const imageFormatSchema = z.union([
	z.literal(SupportedImageFormat.Webp),
	z.literal(SupportedImageFormat.Jpeg),
	z.literal(SupportedImageFormat.Png),
])

const exactResize = z.object({
	mode: z.literal('exact'),
	height: z.number().int().positive(),
	width: z.number().int().positive(),
})

const scaledEventlyByFactor = z.object({
	mode: z.literal('scaleEvenlyByFactor'),
	factor: z.number().refine((value) => value > 0 && value <= 1, {
		message: 'Factor must be between 0 and 1',
	}),
})

const scaledDimension = z.object({
	mode: z.literal('scaleDimension'),
	dimension: z.enum(['HEIGHT', 'WIDTH']),
	size: z.number().int().positive(),
})

const resizeOptionsSchema = z.union([exactResize, scaledEventlyByFactor, scaledDimension])

const thumbnailConfig = z.object({
	enabled: z.boolean().default(false),
	format: imageFormatSchema.default(SupportedImageFormat.Webp),
	quality: z
		.number()
		.int()
		.nullish()
		.refine(
			(value) => value == undefined || (value > 0 && value <= 100),
			() => ({
				message: 'Thumbnail quality must be between 0 and 100',
			}),
		),
	resizeMethod: resizeOptionsSchema.nullish(),
})

/**
 * A function which builds a schema used for validating form data when creating or updating a library
 */
export const buildSchema = (
	existingLibraries: CreateLibrarySceneExistingLibrariesQuery['libraries']['nodes'],
	library?: Library,
) =>
	z.object({
		convertRarToZip: z.boolean().default(false),
		defaultReadingDir: z.enum(['LTR', 'RTL']).default('LTR').optional(),
		defaultReadingImageScaleFit: z
			.enum(['AUTO', 'HEIGHT', 'WIDTH', 'NONE'])
			.default('HEIGHT')
			.optional(),
		defaultReadingMode: z
			.enum(['PAGED', 'CONTINUOUS_VERTICAL', 'CONTINUOUS_HORIZONTAL'])
			.default('PAGED')
			.optional(),
		description: z.string().nullable().optional(),
		generateFileHashes: z.boolean().default(false),
		generateKoreaderHashes: z.boolean().default(false),
		hardDeleteConversions: z.boolean().default(false),
		watch: z.boolean().default(true),
		ignoreRules: z
			.array(
				z.object({
					glob: z.string().refine(isValidGlob, { message: 'Invalid glob pattern' }),
					ignore_parents: z.boolean().default(false),
					ignore_subdirs: z.boolean().default(false),
				}),
			)
			.default([]),
		libraryPattern: z.string().refine(isLibraryPattern).default('SERIES_BASED'),
		name: z
			.string()
			.min(1, { message: 'Library name is required' })
			.refine(
				// return falsy value to indicate failure.
				// If the library name is already taken -> fail
				// If the name is not changing -> pass (override the fail)
				(val) => {
					const isTaken = existingLibraries.some((l) => l.name === val)
					const isUnchanged = library?.name === val
					return !isTaken || isUnchanged
				},
				(val) => ({
					message: `You already have a library named ${val}.`,
				}),
			),
		path: z
			.string()
			.min(1, { message: 'Library path is required' })
			.refine(
				// return falsy value to indicate failure.
				// If the path is a parent to any existing library -> fail
				// If the path is a child to any existing library -> fail
				// If the path is not changing -> pass (override the fail)
				(val) => {
					const isParent = existingLibraries.some((l) => l.path.startsWith(val))
					const isChild = existingLibraries.some((l) => val.startsWith(l.path))
					const isUnchanged = library?.path === val
					return (!isParent && !isChild) || isUnchanged
				},
				() => ({
					message: 'Invalid library path, a parent or sub-directory already exists as a library.',
				}),
			),
		processMetadata: z.boolean().default(true),
		scanAfterPersist: z.boolean().default(true),
		tags: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
		thumbnailConfig,
	})
export type CreateOrUpdateLibrarySchema = z.infer<ReturnType<typeof buildSchema>>

/**
 * A function to create the default values for the form which creates or updates a library,
 * provided an existing library (if editing)
 */
export const formDefaults = (
	library?: Library & LibrarySettingsConfigFragment,
): CreateOrUpdateLibrarySchema => ({
	convertRarToZip: library?.config.convertRarToZip ?? false,
	defaultReadingDir: library?.config.defaultReadingDir || ReadingDirection.Ltr,
	defaultReadingImageScaleFit:
		library?.config.defaultReadingImageScaleFit || ReadingImageScaleFit.Height,
	defaultReadingMode: library?.config.defaultReadingMode || ReadingMode.Paged,
	description: library?.description,
	generateFileHashes: library?.config.generateFileHashes ?? false,
	generateKoreaderHashes: library?.config.generateKoreaderHashes ?? false,
	hardDeleteConversions: library?.config.hardDeleteConversions ?? false,
	watch: library?.config.watch ?? true,
	ignoreRules: toFormIgnoreRules(library?.config.ignoreRules || []),
	libraryPattern: library?.config.libraryPattern || LibraryPattern.SeriesBased,
	name: library?.name || '',
	path: library?.path || '',
	processMetadata: library?.config.processMetadata ?? true,
	scanAfterPersist: true,
	tags: library?.tags?.map((t) => ({ label: t.name, value: t.name.toLowerCase() })),
	thumbnailConfig: intoFormThumbnailConfig(library?.config.thumbnailConfig),
})

// TODO: Investigate https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-validation-schema

export const intoThumbnailConfig = (
	config: CreateOrUpdateLibrarySchema['thumbnailConfig'],
): LibraryConfigInput['thumbnailConfig'] => {
	if (!config.enabled) return null

	const converted = match(config.resizeMethod)
		.with({ mode: 'scaleEvenlyByFactor' }, ({ factor }) => {
			return {
				...config,
				resizeMethod: {
					scaleEvenlyByFactor: {
						factor,
					},
				},
			}
		})
		.with({ mode: 'scaleDimension' }, ({ dimension, size }) => {
			return {
				...config,
				resizeMethod: {
					scaleDimension: {
						dimension: dimension as ScaledDimensionResize['dimension'],
						size,
					},
				},
			}
		})
		.with({ mode: 'exact' }, ({ height, width }) => {
			return {
				...config,
				resizeMethod: {
					exact: {
						height,
						width,
					},
				},
			}
		})
		.otherwise(() => null)

	return omit(converted, 'enabled')
}

export const intoFormThumbnailConfig = (
	config: LibrarySettingsConfigFragment['config']['thumbnailConfig'],
): CreateOrUpdateLibrarySchema['thumbnailConfig'] => {
	if (!config) {
		return {
			enabled: false,
			format: SupportedImageFormat.Webp,
			quality: undefined,
			resizeMethod: undefined,
		}
	}

	const baseConfig = {
		enabled: true,
		format: config.format,
		quality: config.quality,
	}

	if (!config.resizeMethod) {
		return baseConfig
	}

	if (config.resizeMethod.__typename === 'ScaleEvenlyByFactor') {
		return {
			...baseConfig,
			resizeMethod: {
				mode: 'scaleEvenlyByFactor',
				factor: Number(config.resizeMethod.factor),
			},
		}
	}

	if (config.resizeMethod.__typename === 'ScaledDimensionResize') {
		return {
			...baseConfig,
			resizeMethod: {
				mode: 'scaleDimension',
				dimension: config.resizeMethod.dimension,
				size: config.resizeMethod.size,
			},
		}
	}

	if (config.resizeMethod.__typename === 'ExactDimensionResize') {
		return {
			...baseConfig,
			resizeMethod: {
				mode: 'exact',
				height: config.resizeMethod.height,
				width: config.resizeMethod.width,
			},
		}
	}

	console.warn('Unknown thumbnail resize method:', config.resizeMethod)

	return baseConfig
}

/**
 * A function to ensure that the thumbnail config is valid before returning it
 */
export const ensureValidThumbnailConfig = (
	config: PickSelect<CreateOrUpdateLibrarySchema, 'thumbnailConfig'>,
) => {
	const { enabled, resizeMethod } = config
	if (!enabled || !resizeMethod) {
		return null
	}

	const parseResult = thumbnailConfig.safeParse(intoThumbnailConfig(config))
	if (!parseResult.success) {
		console.warn('Invalid thumbnail config:', parseResult.error.format())
		return null
	}
	return parseResult.data
}
