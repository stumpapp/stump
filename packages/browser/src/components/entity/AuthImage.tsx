import { queryClient, useSDK } from '@stump/client'
import { forwardRef, useCallback, useEffect, useState } from 'react'

type Props = {
	token?: string
} & React.ImgHTMLAttributes<HTMLImageElement>
export const AuthImage = forwardRef<HTMLImageElement, Props>(({ token, src, ...props }, ref) => {
	const { sdk } = useSDK()

	const [imageURL, setImageURL] = useState<string | null>(null)

	const doFetch = useCallback(
		async (url: string) => {
			const response = await sdk.axios.get(url, { responseType: 'arraybuffer' })
			const blob = new Blob([response.data], { type: response.headers['content-type'] })
			return blob
		},
		[sdk.axios],
	)
	const fetchImage = useCallback(
		async (url: string) => {
			const data = await queryClient.fetchQuery({
				queryKey: ['AuthImage.fetchImage', url],
				staleTime: 1000 * 60 * 60 * 24 * 5, // 5 days
				queryFn: async () => doFetch(url),
			})

			const imageURL = URL.createObjectURL(data)
			setImageURL(imageURL)
		},
		[doFetch],
	)

	useEffect(() => {
		if (token && src && !imageURL) {
			fetchImage(src)
		}
	}, [token, src, fetchImage, imageURL])

	useEffect(() => {
		return () => {
			if (imageURL) {
				URL.revokeObjectURL(imageURL)
			}
		}
	}, [imageURL])

	if (!imageURL) {
		return null
	}

	return <img {...props} ref={ref} src={imageURL ?? undefined} />
})
AuthImage.displayName = 'AuthImage'
