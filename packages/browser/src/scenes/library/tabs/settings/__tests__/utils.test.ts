import { transformConfigForMutation } from '../utils'

describe('transformConfigForMutation', () => {
	it('should return undefined config as-is', () => {
		expect(transformConfigForMutation(undefined)).toBeUndefined()
	})

	it('should return config without thumbnailConfig as-is', () => {
		const config = {
			convertRarToZip: true,
			processMetadata: false,
		}
		expect(transformConfigForMutation(config as any)).toEqual(config)
	})

	it('should strip __typename from thumbnailConfig', () => {
		const config = {
			convertRarToZip: true,
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Webp' as const,
				quality: 80,
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			convertRarToZip: true,
			thumbnailConfig: {
				format: 'Webp',
				quality: 80,
				resizeMethod: undefined,
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
	})

	it('should transform ScaleEvenlyByFactor resize method', () => {
		const config = {
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Webp' as const,
				quality: 75,
				resizeMethod: {
					__typename: 'ScaleEvenlyByFactor' as const,
					factor: '0.5',
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			thumbnailConfig: {
				format: 'Webp',
				quality: 75,
				resizeMethod: {
					scaleEvenlyByFactor: { factor: '0.5' },
				},
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
	})

	it('should transform ExactDimensionResize resize method', () => {
		const config = {
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Jpeg' as const,
				quality: 90,
				resizeMethod: {
					__typename: 'ExactDimensionResize' as const,
					width: 200,
					height: 300,
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			thumbnailConfig: {
				format: 'Jpeg',
				quality: 90,
				resizeMethod: {
					exact: { width: 200, height: 300 },
				},
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
	})

	it('should transform ScaledDimensionResize resize method', () => {
		const config = {
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Png' as const,
				quality: 100,
				resizeMethod: {
					__typename: 'ScaledDimensionResize' as const,
					dimension: 'Width',
					size: 150,
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			thumbnailConfig: {
				format: 'Png',
				quality: 100,
				resizeMethod: {
					scaleDimension: { dimension: 'Width', size: 150 },
				},
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
	})

	it('should preserve other config fields when transforming', () => {
		const config = {
			convertRarToZip: true,
			hardDeleteConversions: false,
			processMetadata: true,
			watch: true,
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Webp' as const,
				quality: 80,
				page: 1,
				resizeMethod: {
					__typename: 'ScaleEvenlyByFactor' as const,
					factor: '0.75',
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			convertRarToZip: true,
			hardDeleteConversions: false,
			processMetadata: true,
			watch: true,
			thumbnailConfig: {
				format: 'Webp',
				quality: 80,
				page: 1,
				resizeMethod: {
					scaleEvenlyByFactor: { factor: '0.75' },
				},
			},
		})
	})

	it('should handle resizeMethod without __typename', () => {
		const config = {
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Webp' as const,
				quality: 80,
				resizeMethod: {
					scaleEvenlyByFactor: { factor: '0.5' },
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			thumbnailConfig: {
				format: 'Webp',
				quality: 80,
				resizeMethod: {
					scaleEvenlyByFactor: { factor: '0.5' },
				},
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
	})

	it('should handle unknown resize method type by returning without resizeMethod', () => {
		const config = {
			thumbnailConfig: {
				__typename: 'ImageProcessorOptions' as const,
				format: 'Webp' as const,
				quality: 80,
				resizeMethod: {
					__typename: 'UnknownType' as const,
				},
			},
		}

		const result = transformConfigForMutation(config as any)

		expect(result).toEqual({
			thumbnailConfig: {
				format: 'Webp',
				quality: 80,
			},
		})
		expect(result?.thumbnailConfig).not.toHaveProperty('__typename')
		expect(result?.thumbnailConfig).not.toHaveProperty('resizeMethod')
	})
})
