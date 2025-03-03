import { Image as EImage, ImageProps } from 'expo-image'

import { usePreferencesStore } from '~/stores'

export const Image = (props: ImageProps) => {
	const cachePolicy = usePreferencesStore((state) => state.cachePolicy)

	return <EImage cachePolicy={cachePolicy} {...props} />
}
