import { PickSelect } from '@stump/components'
import {
	LibraryPattern,
	LibrarySettingsConfigFragment,
	ReadingDirection,
	ReadingImageScaleFit,
	ReadingMode,
} from '@stump/graphql'
import isValidGlob from 'is-valid-glob'
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

const imageFormatSchema = z.union([z.literal('Webp'), z.literal('Jpeg'), z.literal('Png')])

const resizeOptionsSchema = z
	.object({
		height: z.number().refine((value) => value > 0, { message: 'Must be greater than 0' }),
		mode: z.union([z.literal('Scaled'), z.literal('Sized')]),
		width: z.number().refine((value) => value > 0, { message: 'Must be greater than 0' }),
	})
	.refine(
		(value) => {
			if (value.mode === 'Scaled') {
				const isInCorrectRange = (num: number) => num > 0 && num <= 1
				return isInCorrectRange(value.height) && isInCorrectRange(value.width)
			} else {
				return (
					value.height >= 1 &&
					value.width >= 1 &&
					Number.isInteger(value.height) &&
					Number.isInteger(value.width)
				)
			}
		},
		(value) => ({
			message:
				value.mode === 'Scaled'
					? 'Height and width must be between 0 and 1'
					: 'Height and width must be whole numbers greater than 0',
		}),
	)
/**
 * A function which builds a schema used for validating form data when creating or updating a library
 */
export const buildSchema = (existingLibraries: Library[], library?: Library) =>
	z.object({
		convertRarToZip: z.boolean().default(false),
		defaultReadingDir: z.enum(['LTR', 'RTL']).default('LTR').optional(),
		defaultReadingImageScaleFit: z.enum(['HEIGHT', 'WIDTH', 'NONE']).default('HEIGHT').optional(),
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
				// return falsy value to indicate failure. In this case, if library name is already taken,
				// and we aren't editing that library, then it should fail.
				(val) => !(existingLibraries.some((l) => l.name === val) && library?.name !== val),
				(val) => ({
					message: `You already have a library named ${val}.`,
				}),
			),
		path: z
			.string()
			.min(1, { message: 'Library path is required' })
			.refine(
				// check if path is parent to any existing library
				// if so, and we aren't editing that library, return falsy value to indicate failure
				(val) => !(existingLibraries.some((l) => l.path.startsWith(val)) && library?.path !== val),
				() => ({
					message: 'Invalid library, parent directory already exists as library.',
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
		imageProcessorOptions: z.object({
			enabled: z.boolean().default(false),
			format: imageFormatSchema.default('Webp'),
			quality: z
				.number()
				.nullable()
				.optional()
				.refine(
					(value) => value == undefined || (value > 0 && value <= 1.0),
					() => ({
						message: 'Thumbnail quality must be between 0 and 1.0',
					}),
				),
			resizeMethod: resizeOptionsSchema.nullable().optional(),
		}),
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
	imageProcessorOptions: library?.config.imageProcessorOptions
		? {
				enabled: true,
				...library?.config.imageProcessorOptions,
			}
		: {
				enabled: false,
				format: 'Webp',
				quality: undefined,
				resizeMethod: undefined,
			},
})

/**
 * A function to ensure that the thumbnail config is valid before returning it
 */
export const ensureValidThumbnailConfig = (
	imageProcessorOptions: PickSelect<CreateOrUpdateLibrarySchema, 'imageProcessorOptions'>,
) => {
	const invalidDimensions =
		!imageProcessorOptions.resizeMethod?.height || !imageProcessorOptions.resizeMethod?.width

	if (!imageProcessorOptions.enabled || invalidDimensions) {
		return null
	} else {
		return imageProcessorOptions
	}
}
