import { queryClient, useSDK } from '@stump/client'
import { forwardRef, useCallback, useEffect, useState } from 'react'

type Props = {
	token?: string
} & React.ImgHTMLAttributes<HTMLImageElement>

type LoadedImage = {
	src: string
	token: string
	url: string
}

export const AuthImage = forwardRef<HTMLImageElement, Props>(({ token, src, ...props }, ref) => {
	const { sdk } = useSDK()

	const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)

	const doFetch = useCallback(
		async (url: string) => {
			const response = await sdk.axios.get(url, { responseType: 'arraybuffer' })
			const blob = new Blob([response.data], {
				type: contentHeader(response.headers['content-type']),
			})
			return blob
		},
		[sdk.axios],
	)
	const fetchImage = useCallback(
		(url: string) =>
			queryClient.fetchQuery({
				queryKey: ['AuthImage.fetchImage', url],
				staleTime: 1000 * 60 * 60 * 24 * 5,
				queryFn: () => doFetch(url),
			}),
		[doFetch],
	)

	useEffect(() => {
		let active = true

		if (token && src) {
			fetchImage(src)
				.then((data) => {
					if (active) {
						setLoadedImage({ src, token, url: URL.createObjectURL(data) })
					}
				})
				.catch((error) => {
					if (active) {
						setLoadedImage({ src, token, url: src })
						console.error('Failed to load authenticated image:', error)
					}
				})
		}

		return () => {
			active = false
		}
	}, [token, src, fetchImage])

	useEffect(() => {
		return () => {
			if (loadedImage?.url.startsWith('blob:')) {
				URL.revokeObjectURL(loadedImage.url)
			}
		}
	}, [loadedImage])

	const imageURL =
		loadedImage && loadedImage.src === src && loadedImage.token === token ? loadedImage.url : null

	if (!imageURL) {
		return null
	}

	return <img {...props} ref={ref} src={imageURL ?? undefined} />
})
AuthImage.displayName = 'AuthImage'

const contentHeader = (raw: unknown) => {
	if (typeof raw === 'string') return raw
	return 'application/octet-stream'
}
