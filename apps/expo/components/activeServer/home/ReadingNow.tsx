import { useSDK } from '@stump/client'
import { Media } from '@stump/sdk'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { BookMetaLink } from '~/components/book'
import { Heading, Progress, Text } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { getBookProgression } from '~/lib/sdk/utils'

import { useActiveServer } from '../context'

type Props = {
	book: Media
}

export default function ReadingNow({ book }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { width, isTablet } = useDisplay()

	const activeBookProgress = useMemo(() => getBookProgression(book), [book])

	// TODO: figure out why I need explicit widths for *each* elem
	const renderBookContent = useCallback(() => {
		if (!isTablet) return null

		const contentWidth =
			width -
			16 * 2 - // page padding
			400 * (2 / 3) - // image width
			16 // gap between image and text

		const description = book.metadata?.summary || ''
		const genres = book.metadata?.genre?.map((genre) => `#${genre}`).join(', ')
		const links = book.metadata?.links || []

		return (
			<View className="flex flex-col flex-wrap gap-2">
				<Heading
					style={{
						width: contentWidth,
					}}
				>
					{book.metadata?.title || book.name}
				</Heading>

				{description && (
					<Text
						style={{
							width: contentWidth,
						}}
						numberOfLines={4}
					>
						{description}
					</Text>
				)}

				<View />
				<View />

				{genres && (
					<Text
						style={{
							width: contentWidth,
						}}
					>
						{genres}
					</Text>
				)}

				{links.length > 0 && (
					<View
						className="flex flex-row flex-wrap gap-2"
						style={{
							width: contentWidth,
						}}
					>
						{links.slice(0, 3).map((link) => (
							<BookMetaLink key={link} href={link} />
						))}
					</View>
				)}
			</View>
		)
	}, [isTablet, width, book])

	const router = useRouter()

	return (
		<View className="flex items-start gap-4">
			<Heading size="lg">Reading Now</Heading>

			<View className="flex flex-row gap-4">
				<Pressable
					className="relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg"
					onPress={() => router.navigate(`/server/${serverID}/books/${book.id}`)}
				>
					<View className="absolute inset-0 z-10 bg-black" style={{ opacity: 0.5 }} />
					<Image
						className="z-0"
						source={{
							uri: sdk.media.thumbnailURL(book.id),
							headers: {
								Authorization: `Bearer ${sdk.token}`,
							},
						}}
						contentFit="fill"
						style={{ height: 400, width: 400 * (2 / 3) }}
					/>

					<View className="absolute bottom-0 z-20 w-full gap-2 p-2">
						{!isTablet && (
							<Text
								className="text-2xl font-bold leading-8 text-white"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
								}}
							>
								{book.metadata?.title || book.name}
							</Text>
						)}

						{activeBookProgress && <Progress className="h-1" value={activeBookProgress} />}
					</View>
				</Pressable>

				{renderBookContent()}
			</View>
		</View>
	)
}
