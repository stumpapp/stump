//import { useState } from 'react'
//import { StyleSheet } from 'react-native'
import TImage, { type TurboImageProps } from 'react-native-turbo-image'

//import { usePreferencesStore } from '~/stores'
//import { CachePolicy } from '~/stores/reader'

//export const Image = (props: ImageProps) => {
//	const cachePolicy = usePreferencesStore((state) => state.cachePolicy)
//	const allowDownscaling = usePreferencesStore((state) => state.allowDownscaling)
//
//	return <EImage cachePolicy={cachePolicy} allowDownscaling={allowDownscaling} {...props} />
//}

export const TurboImage = ({ source, style, ...props }: TurboImageProps) => {
	return <TImage source={source} cachePolicy="dataCache" style={style} {...props} />
}
