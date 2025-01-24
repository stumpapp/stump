import { queryClient } from '@stump/client'
import { Image, ImageProps } from 'expo-image'
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'

type Props = {
	url: string
} & Omit<ImageProps, 'source'>

const isAndroid = Platform.OS === 'android'

export default function EntityImage({ url, ...props }: Props) {
	const [base64Image, setBase64Image] = useState<string | null>(null)

	// TODO: handle error and display fallback
	const handleFetchImage = useCallback(async (url: string) => {
		try {
			const base64Image = await fetchImage(url)
			setBase64Image(base64Image)
		} catch (e) {
			console.error(e)
		}
	}, [])

	useEffect(() => {
		if (!base64Image && isAndroid) {
			handleFetchImage(url)
		}
	}, [base64Image, handleFetchImage, url])

	if (!base64Image && isAndroid) {
		return null
	}

	// TODO: support pinch and zoom
	// https://github.com/likashefqet/react-native-image-zoom
	// https://github.com/fakeheal/react-native-pan-pinch-view
	// https://gist.github.com/Glazzes/357201f74fbfaddb3e933f4c258c4878
	return (
		<Image source={{ uri: isAndroid ? base64Image : url }} {...props} cachePolicy="memory-disk" />
	)
}

export const fetchImage = async (url: string) => {
	const response = await queryClient.fetchQuery([url], async () => fetch(url))
	if (!response.bodyUsed) {
		const blob = await response.blob()
		const reader = new FileReader()
		return new Promise<string>((resolve, reject) => {
			reader.onloadend = () => {
				resolve(reader.result as string)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	} else {
		return response.url
	}
}

export const prefetchImage = async (url: string) => {
	if (isAndroid) {
		const base64Image = await fetchImage(url)
		return Image.prefetch(base64Image)
	} else {
		return Image.prefetch(url)
	}
}
