import { PickSelect } from '@stump/components'
import { IgnoreRules, Library, LibraryPattern, LibraryScanMode } from '@stump/sdk'
import isValidGlob from 'is-valid-glob'
import { z } from 'zod'

/**
 * A type guard to check if the input is a valid {@link LibraryScanMode}
 */
const isLibraryScanMode = (input: string): input is LibraryScanMode => {
	return input === 'DEFAULT' || input === 'QUICK' || input === 'NONE' || !input
}

/**
 * A type guard to check if the input is a valid {@link LibraryPattern}
 */
const isLibraryPattern = (input: string): input is LibraryPattern => {
	return input === 'SERIES_BASED' || input === 'COLLECTION_BASED' || !input
}
/**
 * A helper function to convert persisted ignore rules to the form format
 */
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
/**
 * A function which builds a schema used for validating form data when creating or updating a library
 */
export const buildSchema = (existingLibraries: Library[], library?: Library) =>
	z.object({
		convert_rar_to_zip: z.boolean().default(false),
		default_reading_dir: z.enum(['ltr', 'rtl']).default('ltr').optional(),
		default_reading_image_scale_fit: z
			.enum(['auto', 'height', 'width', 'none'])
			.default('height')
			.optional(),
		default_reading_mode: z
			.enum(['paged', 'continuous:vertical', 'continuous:horizontal'])
			.default('paged')
			.optional(),
		description: z.string().nullable().optional(),
		generate_file_hashes: z.boolean().default(false),
		generate_koreader_hashes: z.boolean().default(false),
		hard_delete_conversions: z.boolean().default(false),
		watch: z.boolean().default(true),
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
		process_metadata: z.boolean().default(true),
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
export type CreateOrUpdateLibrarySchema = z.infer<ReturnType<typeof buildSchema>>

/**
 * A function to create the default values for the form which creates or updates a library,
 * provided an existing library (if editing)
 */
export const formDefaults = (library?: Library): CreateOrUpdateLibrarySchema => ({
	convert_rar_to_zip: library?.config.convert_rar_to_zip ?? false,
	default_reading_dir: library?.config.default_reading_dir || 'ltr',
	default_reading_image_scale_fit: library?.config.default_reading_image_scale_fit || 'height',
	default_reading_mode: library?.config.default_reading_mode || 'paged',
	description: library?.description,
	generate_file_hashes: library?.config.generate_file_hashes ?? false,
	generate_koreader_hashes: library?.config.generate_koreader_hashes ?? false,
	hard_delete_conversions: library?.config.hard_delete_conversions ?? false,
	watch: library?.config.watch ?? true,
	ignore_rules: toFormIgnoreRules(library?.config.ignore_rules),
	library_pattern: library?.config.library_pattern || 'SERIES_BASED',
	name: library?.name || '',
	path: library?.path || '',
	process_metadata: library?.config.process_metadata ?? true,
	scan_mode: 'DEFAULT',
	tags: library?.tags?.map((t) => ({ label: t.name, value: t.name.toLowerCase() })),
	thumbnail_config: library?.config.thumbnail_config
		? {
				enabled: true,
				...library?.config.thumbnail_config,
			}
		: {
				enabled: false,
				format: 'Webp',
				quality: undefined,
				resize_options: undefined,
			},
})

/**
 * A function to ensure that the thumbnail config is valid before returning it
 */
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
