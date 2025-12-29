import { usePreferences } from '@/hooks/usePreferences'

import { ThumbnailImage, ThumbnailImageProps } from './ThumbnailImage'

type Props = Pick<ThumbnailImageProps, 'src' | 'alt' | 'borderAndShadowStyle' | 'placeholderData'>

export default function ProminentThumbnailImage(props: Props) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	return (
		<div className="relative w-full max-w-[200px] shrink-0" style={{ aspectRatio: thumbnailRatio }}>
			<ThumbnailImage
				{...props}
				size={{ width: '100%', height: '100%' }}
				borderAndShadowStyle={
					props.borderAndShadowStyle || {
						borderRadius: 8,
						shadowColor: 'rgba(0, 0, 0, 0.15)',
						shadowRadius: 2,
					}
				}
			/>
		</div>
	)
}
