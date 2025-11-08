import { Platform } from 'react-native'
import TImage, { type TurboImageProps } from 'react-native-turbo-image'

export const TurboImage = ({ source, style, ...props }: TurboImageProps) => {
	return (
		<TImage
			source={source}
			cachePolicy="dataCache"
			style={style}
			// This is a weird workaround:
			// Using the indicator prop hides the built in grey placeholder on ios (what we want)
			// but will force show a circular loading indicator on all platforms, so we make it transparent.
			// Android doesn't support transparent (and doesn't have built in placeholders) so we do nothing.
			{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
			{...props}
		/>
	)
}
