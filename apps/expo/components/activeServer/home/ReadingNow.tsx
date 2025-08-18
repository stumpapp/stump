import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, View } from 'react-native'

import { BookMetaLink } from '~/components/book'
import { FasterImage } from '~/components/Image'
import { Heading, Progress, Text } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { getBookProgression } from '~/lib/sdk/utils'

import { useActiveServer } from '../context'

const fragment = graphql(`
	fragment ReadingNow on Media {
		id
		resolvedName
		metadata {
			summary
			genres
			links
		}
		thumbnail {
			url
		}
	}
`)

export type IReadingNowFragment = FragmentType<typeof fragment>

type Props = {
	book: IReadingNowFragment
}

export default function ReadingNow({ book }: Props) {
	const data = useFragment(fragment, book)
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

		const description = data.metadata?.summary || ''
		const genres = data.metadata?.genres?.map((genre) => `#${genre}`).join(', ')
		const links = data.metadata?.links || []

		return (
			<View className="flex flex-col flex-wrap gap-2">
				<Heading
					style={{
						width: contentWidth,
					}}
				>
					{data.resolvedName}
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
	}, [isTablet, width, data])

	const router = useRouter()

	return (
		<View className="flex items-start gap-4">
			<Heading size="lg">Jump Back In</Heading>

			<View className="flex flex-row gap-4">
				<Pressable
					className="relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg"
					onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
				>
					<View className="absolute inset-0 z-10 bg-black" style={{ opacity: 0.5 }} />

					<FasterImage
						source={{
							url: data.thumbnail.url,
							headers: {
								Authorization: sdk.authorizationHeader || '',
							},
							resizeMode: 'fill',
						}}
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
								{data.resolvedName}
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
