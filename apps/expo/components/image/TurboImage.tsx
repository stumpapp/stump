import TImage, { type TurboImageProps } from 'react-native-turbo-image'

export const TurboImage = ({ source, style, ...props }: TurboImageProps) => {
	return <TImage source={source} cachePolicy="dataCache" style={style} {...props} />
}
