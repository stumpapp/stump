import { PickSelect } from '@stump/components'
import { IgnoreRules, Library, LibraryPattern, LibraryScanMode } from '@stump/types'
import isValidGlob from 'is-valid-glob'
import { z } from 'zod'

const isLibraryScanMode = (input: string): input is LibraryScanMode => {
	return input === 'DEFAULT' || input === 'QUICK' || input === 'NONE' || !input
}

const isLibraryPattern = (input: string): input is LibraryPattern => {
	return input === 'SERIES_BASED' || input === 'COLLECTION_BASED' || !input
}

export const toFormIgnoreRules = (ignoreRules: IgnoreRules = []) =>
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
export const buildScema = (existingLibraries: Library[], library?: Library) =>
	z.object({
		convert_rar_to_zip: z.boolean().default(false),
		description: z.string().nullable().optional(),
		hard_delete_conversions: z.boolean().default(false),
		ignore_rules: z
			.array(
				z.object({
					glob: z.string().refine(isValidGlob, { message: 'Invalid glob pattern' }),
					ignore_parents: z.boolean().default(false),
					ignore_subdirs: z.boolean().default(false),
				}),
			)
			.default([]),
		library_pattern: z.string().refine(isLibraryPattern).default('SERIES_BASED'),
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
		scan_mode: z.string().refine(isLibraryScanMode).default('DEFAULT'),
		tags: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
		thumbnail_config: z.object({
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
			resize_options: resizeOptionsSchema.nullable().optional(),
		}),
	})
export type CreateOrUpdateLibrarySchema = z.infer<ReturnType<typeof buildScema>>

export const formDefaults = (library?: Library): CreateOrUpdateLibrarySchema => ({
	convert_rar_to_zip: library?.library_options.convert_rar_to_zip ?? false,
	description: library?.description,
	hard_delete_conversions: library?.library_options.hard_delete_conversions ?? false,
	ignore_rules: toFormIgnoreRules(library?.library_options.ignore_rules),
	library_pattern: library?.library_options.library_pattern || 'SERIES_BASED',
	name: library?.name || '',
	path: library?.path || '',
	scan_mode: 'DEFAULT',
	tags: library?.tags?.map((t) => ({ label: t.name, value: t.name.toLowerCase() })),
	thumbnail_config: library?.library_options.thumbnail_config
		? {
				enabled: true,
				...library?.library_options.thumbnail_config,
			}
		: {
				enabled: false,
				format: 'Png',
				quality: undefined,
				resize_options: undefined,
			},
})

export const toLibraryPatchTags = (library: Library) => library.tags?.map((t) => t.name)
export const libraryPatchDefaults = (library: Library) => ({
	tags: toLibraryPatchTags(library),
})
export const ensureValidThumbnailConfig = (
	thumbnail_config: PickSelect<CreateOrUpdateLibrarySchema, 'thumbnail_config'>,
) => {
	const invalidDimensions =
		!thumbnail_config.resize_options?.height || !thumbnail_config.resize_options?.width

	if (!thumbnail_config.enabled || invalidDimensions) {
		return null
	} else {
		return thumbnail_config
	}
}
