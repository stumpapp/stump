import { Dimension, OrganizationMode, SupportedImageFormat } from '@stump/graphql'
import { z } from 'zod'

import { intoFormThumbnailConfig, intoThumbnailConfig, refineOrganization } from '../schema'

describe('intoThumbnailConfig', () => {
	it('should return null when thumbnails are not enabled', () => {
		const config = {
			enabled: false,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: {
				mode: 'scaleEvenlyByFactor' as const,
				factor: 0.65,
			},
		}

		const result = intoThumbnailConfig(config)

		expect(result).toBeNull()
	})

	it('should return expected config object for each resize method', () => {
		const scaleByFactorConfig = {
			enabled: true,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: {
				mode: 'scaleEvenlyByFactor' as const,
				factor: 0.65,
			},
		}

		const scaleByFactorResult = intoThumbnailConfig(scaleByFactorConfig)
		expect(scaleByFactorResult).toEqual({
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: {
				scaleEvenlyByFactor: {
					factor: 0.65,
				},
			},
		})

		const scaleDimensionConfig = {
			enabled: true,
			format: SupportedImageFormat.Jpeg,
			quality: 80,
			resizeMethod: {
				mode: 'scaleDimension' as const,
				dimension: Dimension.Width,
				size: 800,
			},
		}

		const scaleDimensionResult = intoThumbnailConfig(scaleDimensionConfig)
		expect(scaleDimensionResult).toEqual({
			format: SupportedImageFormat.Jpeg,
			quality: 80,
			resizeMethod: {
				scaleDimension: {
					dimension: Dimension.Width,
					size: 800,
				},
			},
		})

		const exactConfig = {
			enabled: true,
			format: SupportedImageFormat.Png,
			quality: 90,
			resizeMethod: {
				mode: 'exact' as const,
				width: 200,
				height: 300,
			},
		}

		const exactResult = intoThumbnailConfig(exactConfig)
		expect(exactResult).toEqual({
			format: SupportedImageFormat.Png,
			quality: 90,
			resizeMethod: {
				exact: {
					width: 200,
					height: 300,
				},
			},
		})

		const noResizeConfig = {
			enabled: true,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: null,
		}

		const noResizeResult = intoThumbnailConfig(noResizeConfig)
		expect(noResizeResult).toEqual({
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: null,
		})
	})
})

describe('intoFormThumbnailConfig', () => {
	it('should return disabled config with defaults when no config is provided', () => {
		const result = intoFormThumbnailConfig(null)

		expect(result).toEqual({
			enabled: false,
			format: SupportedImageFormat.Webp, // still the default, just trashed when not enabled
			quality: undefined,
			resizeMethod: undefined,
		})
	})

	it('should transform GraphQL config into form config for each resize method', () => {
		const scaleByFactorConfig = {
			__typename: 'ImageProcessorOptions' as const,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: {
				__typename: 'ScaleEvenlyByFactor' as const,
				factor: '0.65',
			},
		}

		const scaleByFactorResult = intoFormThumbnailConfig(scaleByFactorConfig)
		expect(scaleByFactorResult).toEqual({
			enabled: true,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: {
				mode: 'scaleEvenlyByFactor',
				factor: 0.65,
			},
		})

		const scaleDimensionConfig = {
			__typename: 'ImageProcessorOptions' as const,
			format: SupportedImageFormat.Jpeg,
			quality: 80,
			resizeMethod: {
				__typename: 'ScaledDimensionResize' as const,
				dimension: Dimension.Width,
				size: 800,
			},
		}

		const scaleDimensionResult = intoFormThumbnailConfig(scaleDimensionConfig)
		expect(scaleDimensionResult).toEqual({
			enabled: true,
			format: SupportedImageFormat.Jpeg,
			quality: 80,
			resizeMethod: {
				mode: 'scaleDimension',
				dimension: Dimension.Width,
				size: 800,
			},
		})

		const exactConfig = {
			__typename: 'ImageProcessorOptions' as const,
			format: SupportedImageFormat.Png,
			quality: 90,
			resizeMethod: {
				__typename: 'ExactDimensionResize' as const,
				width: 200,
				height: 300,
			},
		}

		const exactResult = intoFormThumbnailConfig(exactConfig)
		expect(exactResult).toEqual({
			enabled: true,
			format: SupportedImageFormat.Png,
			quality: 90,
			resizeMethod: {
				mode: 'exact',
				width: 200,
				height: 300,
			},
		})

		const noResizeConfig = {
			__typename: 'ImageProcessorOptions' as const,
			format: SupportedImageFormat.Webp,
			quality: 75,
			resizeMethod: null,
		}

		const noResizeResult = intoFormThumbnailConfig(noResizeConfig)
		expect(noResizeResult).toEqual({
			enabled: true,
			format: SupportedImageFormat.Webp,
			quality: 75,
		})
	})
})

describe('refineOrganization', () => {
	const organization = (library?: Parameters<typeof refineOrganization>[0]) =>
		z
			.object({
				organizationMode: z.nativeEnum(OrganizationMode),
				processMetadata: z.boolean(),
				oneshotsDirectory: z.string().nullish(),
			})
			.superRefine(refineOrganization(library))

	const issuePaths = (result: z.SafeParseReturnType<unknown, unknown>) =>
		result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))

	const metadata = { organizationMode: OrganizationMode.Metadata, processMetadata: true }

	it('should accept a valid metadata library', () => {
		expect(organization().safeParse(metadata).success).toBe(true)
	})

	it('should require metadata processing for metadata libraries', () => {
		const result = organization().safeParse({ ...metadata, processMetadata: false })
		expect(issuePaths(result)).toEqual(['processMetadata'])
	})

	it('should reject a oneshots directory for metadata libraries', () => {
		const result = organization().safeParse({ ...metadata, oneshotsDirectory: 'oneshots' })
		expect(issuePaths(result)).toEqual(['oneshotsDirectory'])
	})

	it('should allow filesystem libraries without metadata processing', () => {
		const result = organization().safeParse({
			organizationMode: OrganizationMode.Filesystem,
			processMetadata: false,
			oneshotsDirectory: 'oneshots',
		})
		expect(result.success).toBe(true)
	})

	it('should reject changing the organization of an existing library', () => {
		const library = {
			config: { organizationMode: OrganizationMode.Filesystem },
		} as Parameters<typeof refineOrganization>[0]
		expect(issuePaths(organization(library).safeParse(metadata))).toEqual(['organizationMode'])
		expect(
			organization(library).safeParse({
				organizationMode: OrganizationMode.Filesystem,
				processMetadata: false,
			}).success,
		).toBe(true)
	})
})
