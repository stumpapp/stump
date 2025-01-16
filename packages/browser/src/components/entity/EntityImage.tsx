import { useSDK } from '@stump/client'
import { forwardRef, Suspense } from 'react'

import { AuthImage } from './AuthImage'

const EntityImage = forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
	({ src, ...props }, ref) => {
		const { sdk } = useSDK()

		const renderImage = () => {
			if (sdk.isTokenAuth) {
				return <AuthImage src={src || ''} token={sdk.token || ''} {...props} ref={ref} />
			} else {
				return <img src={src} {...props} ref={ref} />
			}
		}

		return <Suspense>{renderImage()}</Suspense>
	},
)
EntityImage.displayName = 'EntityImage'

export { EntityImage }
