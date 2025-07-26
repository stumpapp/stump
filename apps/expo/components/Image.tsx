import { FasterImageProps, FasterImageView } from '@candlefinance/faster-image'
import { Image as EImage, ImageProps } from 'expo-image'

import { usePreferencesStore } from '~/stores'
import { CachePolicy } from '~/stores/reader'

export const Image = (props: ImageProps) => {
	const cachePolicy = usePreferencesStore((state) => state.cachePolicy)
	const allowDownscaling = usePreferencesStore((state) => state.allowDownscaling)

	return <EImage cachePolicy={cachePolicy} allowDownscaling={allowDownscaling} {...props} />
}

export const FasterImage = ({ source, ...props }: FasterImageProps) => {
	const cachePolicy = usePreferencesStore((state) => state.cachePolicy)

	return (
		<FasterImageView
			source={{
				cachePolicy: intoFastCachePolicy(cachePolicy),
				...source,
			}}
			{...props}
		/>
	)
}

export const intoFastCachePolicy = (
	policy: CachePolicy,
): FasterImageProps['source']['cachePolicy'] => {
	switch (policy) {
		case 'disk':
			return 'discWithCacheControl'
		case 'memory':
			return 'memory'
		case 'memory-disk':
			return 'memoryAndDisc'
		default:
			return 'discNoCacheControl'
	}
}
