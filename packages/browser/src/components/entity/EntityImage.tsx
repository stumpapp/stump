import { useSDK } from '@stump/client'
import { forwardRef, Suspense, useCallback } from 'react'

import { AuthImage } from './AuthImage'

type Props = {
	onLoad?: ({ height, width }: { height: number; width: number }) => void
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'onLoad'>

const EntityImage = forwardRef<HTMLImageElement, Props>(({ src, onLoad, ...props }, ref) => {
	const { sdk } = useSDK()

	const handleImageLoad = useCallback(
		(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
			const img = e.target as HTMLImageElement
			if (img.naturalHeight && img.naturalWidth) {
				onLoad?.({ height: img.naturalHeight, width: img.naturalWidth })
			}
		},
		[onLoad],
	)

	const renderImage = () => {
		if (sdk.isTokenAuth) {
			return (
				<AuthImage
					src={src || ''}
					token={sdk.token || ''}
					{...props}
					ref={ref}
					onLoad={handleImageLoad}
				/>
			)
		} else {
			return <img src={src} {...props} ref={ref} onLoad={handleImageLoad} />
		}
	}

	return <Suspense>{renderImage()}</Suspense>
})
EntityImage.displayName = 'EntityImage'

export { EntityImage }
