import { CreateOrUpdateLibraryInput, Dimension } from '@stump/graphql'
import omit from 'lodash/omit'

/**
 * Transform the library config to match the GraphQL input schema by:
 * 1. Removing __typename fields (only for queries, not mutations)
 * 2. Restructuring resizeMethod to match the @oneOf input type
 */
export function transformConfigForMutation(
	config: CreateOrUpdateLibraryInput['config'],
): CreateOrUpdateLibraryInput['config'] {
	if (!config) return config

	const { thumbnailConfig, ...rest } = config

	if (!thumbnailConfig) return config

	const { resizeMethod, ...thumbnailRest } = omit(thumbnailConfig, '__typename')

	if (!resizeMethod || !('__typename' in resizeMethod)) {
		return {
			...rest,
			thumbnailConfig: { ...thumbnailRest, resizeMethod },
		}
	}

	// Transform based on the __typename to match the input schema
	if (resizeMethod.__typename === 'ScaleEvenlyByFactor' && 'factor' in resizeMethod) {
		return {
			...rest,
			thumbnailConfig: {
				...thumbnailRest,
				resizeMethod: {
					scaleEvenlyByFactor: { factor: resizeMethod.factor as string },
				},
			},
		}
	}

	if (
		resizeMethod.__typename === 'ExactDimensionResize' &&
		'width' in resizeMethod &&
		'height' in resizeMethod
	) {
		return {
			...rest,
			thumbnailConfig: {
				...thumbnailRest,
				resizeMethod: {
					exact: { width: resizeMethod.width as number, height: resizeMethod.height as number },
				},
			},
		}
	}

	if (
		resizeMethod.__typename === 'ScaledDimensionResize' &&
		'dimension' in resizeMethod &&
		'size' in resizeMethod
	) {
		return {
			...rest,
			thumbnailConfig: {
				...thumbnailRest,
				resizeMethod: {
					scaleDimension: {
						dimension: resizeMethod.dimension as Dimension,
						size: resizeMethod.size as number,
					},
				},
			},
		}
	}

	// If we can't match the type, return without resizeMethod
	return {
		...rest,
		thumbnailConfig: thumbnailRest,
	}
}
