import { useMediaByIdQuery, useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native'
import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { BookMetaLink } from '~/components/activeServer/book'
import { Button, Heading, Text } from '~/components/ui'
import { formatBytes } from '~/lib/format'

// TODO: progression states (e.g., read, continue, etc)
export default function Screen() {
	const { id: bookID } = useLocalSearchParams<{ id: string }>()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { sdk } = useSDK()
	const { media } = useMediaByIdQuery(bookID, { suspense: true })

	const router = useRouter()

	if (!media) return null

	const formattedSize = formatBytes(media.size)
	const summary = media.metadata?.summary || ''
	const description = summary.length > 147 ? `${summary.slice(0, 147)}...` : summary
	const genres = media.metadata?.genre?.map((genre) => `#${genre}`).join(', ')
	const links = media.metadata?.links || []
	const pages = media.metadata?.page_count || media.pages
	const characters = media.metadata?.characters?.join(', ')

	const seriesName = media.metadata?.series
	const seriesPosition = media.metadata?.number
	const seriesVolume = media.metadata?.volume

	const publisher = media.metadata?.publisher
	const writers = media.metadata?.writers?.join(', ')
	const colorists = media.metadata?.colorists?.join(', ')
	const inkers = media.metadata?.inkers?.join(', ')
	const letterers = media.metadata?.letterers?.join(', ')
	const coverArtists = media.metadata?.cover_artists?.join(', ')

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 bg-background px-6 py-3">
				<View className="flex-1 gap-8">
					<View className="flex items-start gap-4">
						<Heading size="lg" className="mt-6 leading-6">
							{media.metadata?.title || media.name}
						</Heading>
						<View className="aspect-[2/3] self-center overflow-hidden rounded-lg">
							<Image
								source={{
									uri: sdk.media.thumbnailURL(media.id),
									headers: {
										Authorization: sdk.authorizationHeader,
									},
								}}
								contentFit="fill"
								style={{ height: 350, width: 'auto' }}
							/>
						</View>
					</View>

					<View className="flex w-full flex-row items-center gap-2 tablet:max-w-sm tablet:self-center">
						<Button
							className="flex-1 border border-edge"
							onPress={() =>
								router.push({
									pathname: `/server/${serverID}/books/${bookID}/read`,
								})
							}
						>
							<Text>Read</Text>
						</Button>
						<Button variant="secondary">
							<Text>Download</Text>
						</Button>
					</View>

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Information</Text>

						<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
							<InfoRow label="Identifier" value={media.id} />
							<InfoRow label="Pages" value={pages.toString()} />
							<InfoRow label="Kind" value={media.extension.toUpperCase()} />
							{formattedSize && <InfoRow label="Size" value={formattedSize} />}
						</View>
					</View>

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Metadata</Text>

						<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
							{description && <InfoRow label="Description" value={description} />}

							{seriesName && <InfoRow label="Series Name" value={seriesName} />}
							{seriesPosition && (
								<InfoRow
									label={seriesName ? 'Position' : 'Series Position'}
									value={seriesPosition.toString()}
								/>
							)}
							{seriesVolume && <InfoRow label="Volume" value={seriesVolume.toString()} />}

							{genres && <InfoRow label="Genres" value={genres} />}
							{characters && <InfoRow label="Characters" value={characters} />}
						</View>
					</View>

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Acknowledgements</Text>

						<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
							{publisher && <InfoRow label="Publisher" value={publisher} />}
							{writers && <InfoRow label="Writers" value={writers} />}
							{colorists && <InfoRow label="Colorists" value={colorists} />}
							{inkers && <InfoRow label="Inkers" value={inkers} />}
							{letterers && <InfoRow label="Letterers" value={letterers} />}
							{coverArtists && <InfoRow label="Cover Artists" value={coverArtists} />}
						</View>
					</View>

					{links.length > 0 && (
						<View className="flex w-full gap-2">
							<Text className="text-lg text-foreground-muted">Links</Text>

							<View className="flex flex-row flex-wrap gap-2 p-3">
								{links.map((link) => (
									<BookMetaLink key={link} href={link} />
								))}
							</View>
						</View>
					)}

					{/* END */}
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
	<View className="flex flex-row items-start justify-between py-1">
		<Text className="shrink-0 text-foreground-subtle">{label}</Text>
		<Text className="max-w-[75%] truncate text-right">{value}</Text>
	</View>
)
