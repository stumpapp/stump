import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import dayjs from 'dayjs'
import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import LinearGradient from 'react-native-linear-gradient'

import { BookMetaLink } from '~/components/book'
import { FasterImage } from '~/components/Image'
import { Heading, Progress, Text } from '~/components/ui'
import { COLORS } from '~/lib/constants'
import { parseGraphQLDecimal } from '~/lib/format'
import { useDisplay } from '~/lib/hooks'

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
		pages
		readProgress {
			epubcfi
			page
			percentageCompleted
			updatedAt
		}
	}
`)

export type IReadingNowFragment = FragmentType<typeof fragment>

type Props = {
	books: (IReadingNowFragment & { id: string })[]
}

export default function ReadingNow({ books }: Props) {
	return (
		<View className="flex items-start gap-4">
			<Heading size="xl">Jump Back In</Heading>

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="w-full"
				pagingEnabled
			>
				<View className="flex flex-row gap-4">
					{books.map((book) => (
						<ReadingNowItem key={book.id} book={book} />
					))}
				</View>
			</ScrollView>
		</View>
	)
}

type ReadingNowItemProps = {
	book: IReadingNowFragment
}

function ReadingNowItem({ book }: ReadingNowItemProps) {
	const data = useFragment(fragment, book)
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { width, isTablet } = useDisplay()

	const percentageCompleted = parseGraphQLDecimal(data.readProgress?.percentageCompleted)

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
		<View className="flex flex-row gap-4">
			<Pressable
				className="relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg"
				onPress={() => router.navigate(`/server/${serverID}/books/${data.id}`)}
			>
				<LinearGradient
					colors={['transparent', 'rgba(0, 0, 0, 0.90)']}
					style={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 8 }}
				/>

				<FasterImage
					source={{
						url: data.thumbnail.url,
						headers: {
							Authorization: sdk.authorizationHeader || '',
						},
						resizeMode: 'fill',
						borderRadius: 8,
					}}
					style={{ height: 400, width: 400 * (2 / 3) }}
				/>

				<View className="absolute bottom-0 z-20 w-full gap-2 p-2">
					{!isTablet && (
						<Text
							className="text-2xl font-bold leading-8"
							style={{
								textShadowOffset: { width: 2, height: 1 },
								textShadowRadius: 2,
								textShadowColor: 'rgba(0, 0, 0, 0.5)',
								zIndex: 20,
								color: COLORS.dark.foreground.DEFAULT,
							}}
						>
							{data.resolvedName}
						</Text>
					)}

					<View className="flex items-start gap-2">
						<View className="flex w-full flex-row items-center justify-between">
							{!!data.readProgress?.page && data.readProgress.page > 0 && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{data.readProgress?.page} of {data.pages}
								</Text>
							)}

							{!!data.readProgress?.epubcfi && percentageCompleted != null && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{(percentageCompleted * 100).toFixed(0)}%
								</Text>
							)}

							{!!data.readProgress?.updatedAt && (
								<Text
									className="flex-wrap text-base"
									style={{
										color: COLORS.dark.foreground.subtle,
										opacity: 0.9,
									}}
								>
									{dayjs(data.readProgress?.updatedAt).fromNow()}
								</Text>
							)}
						</View>

						{percentageCompleted && (
							<Progress
								className="h-1 bg-[#898d94]"
								indicatorClassName="bg-[#f5f3ef]"
								value={percentageCompleted * 100}
							/>
						)}
					</View>
				</View>
			</Pressable>

			{renderBookContent()}
		</View>
	)
}
