import { usePreferences } from '@/hooks/usePreferences'

import { ThumbnailImage, ThumbnailImageProps } from './ThumbnailImage'

type Props = Pick<ThumbnailImageProps, 'src' | 'alt' | 'borderAndShadowStyle' | 'placeholderData'>

export default function ProminentThumbnailImage(props: Props) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	return (
		<div className="max-w-50 relative w-full shrink-0" style={{ aspectRatio: thumbnailRatio }}>
			<ThumbnailImage
				{...props}
				size={{ width: '100%', height: '100%' }}
				borderAndShadowStyle={
					props.borderAndShadowStyle || {
						shadowColor: 'rgba(0, 0, 0, 0.15)',
						shadowRadius: 2,
					}
				}
			/>
		</div>
	)
}
