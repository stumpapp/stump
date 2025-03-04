import { Image as EImage, ImageProps } from 'expo-image'

import { usePreferencesStore } from '~/stores'

export const Image = (props: ImageProps) => {
	const cachePolicy = usePreferencesStore((state) => state.cachePolicy)
	const allowDownscaling = usePreferencesStore((state) => state.allowDownscaling)

	return <EImage cachePolicy={cachePolicy} allowDownscaling={allowDownscaling} {...props} />
}
