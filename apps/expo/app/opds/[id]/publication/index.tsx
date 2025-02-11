import { useSDK } from '@stump/client'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Pressable, SafeAreaView, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { useActiveServer } from '~/components/activeServer'
import { Button, Heading, icons, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

import { usePublicationContext } from './context'
import { getDateField, getNumberField } from './utils'

const { Info, Slash, BookCopy } = icons

export default function Screen() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		publication: { metadata, images, readingOrder, links },
		url,
	} = usePublicationContext()
	const { title, identifier, belongsTo } = metadata || {}

	const router = useRouter()

	const thumbnailURL = images?.at(0)?.href

	const numberOfPages = getNumberField(metadata, 'numberOfPages') ?? readingOrder?.length
	const modified = getDateField(metadata, 'modified')

	const hasInformation = !!numberOfPages || !!modified
	const seriesURL = belongsTo?.series?.links?.find((link) => link.rel === 'self')?.href

	const downloadURL = links?.find((link) => link.rel === 'http://opds-spec.org/acquisition')?.href
	const canStream = !!readingOrder && readingOrder.length > 0

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1 gap-5 bg-background px-6">
				<View className="flex-1 gap-8">
					<View className="flex items-start gap-4">
						<Heading size="lg" className="mt-6 leading-6">
							{title || 'Publication'}
						</Heading>
						<View className="aspect-[2/3] self-center overflow-hidden rounded-lg">
							<Image
								source={{
									uri: thumbnailURL,
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
									pathname: `/opds/${serverID}/publication/read`,
									params: { url },
								})
							}
							disabled={!canStream}
						>
							<Text>Stream</Text>
						</Button>
						<Button variant="secondary" disabled={!downloadURL}>
							<Text>Download</Text>
						</Button>
					</View>

					{!canStream && (
						<View className="rounded-lg bg-fill-info-secondary p-3">
							<Text>This publication lacks a defined reading order and cannot be streamed</Text>
						</View>
					)}

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Information</Text>

						{hasInformation && (
							<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
								{identifier && (
									<View className="flex flex-row items-start justify-between py-1">
										<Text className="shrink-0 text-foreground-subtle">Identifier</Text>
										<Text className="max-w-[80%] truncate text-right">{identifier}</Text>
									</View>
								)}
								{modified && (
									<View className="flex flex-row items-start justify-between py-1">
										<Text className="shrink-0 text-foreground-subtle">Modified</Text>
										<Text className="max-w-[80%] truncate text-right">
											{modified.format('MMMM DD, YYYY')}
										</Text>
									</View>
								)}
								{numberOfPages && (
									<View className="flex flex-row items-start justify-between py-1">
										<Text className="shrink-0 text-foreground-subtle">Number of pages</Text>
										<Text className="max-w-[80%] truncate text-right">
											{numberOfPages.toString()}
										</Text>
									</View>
								)}
							</View>
						)}

						{!hasInformation && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<Info className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No information available</Text>
							</View>
						)}
					</View>

					<View className="flex w-full gap-2">
						<Text className="text-lg text-foreground-muted">Series</Text>

						{belongsTo?.series && (
							<View className="flex flex-col gap-2 rounded-lg bg-background-surface p-3">
								<View className="flex flex-row items-start justify-between py-1">
									<Text className="shrink-0 text-foreground-subtle">Name</Text>
									<Text className="max-w-[80%] truncate text-right">{belongsTo.series.name}</Text>
								</View>

								{belongsTo.series.position && (
									<View className="flex flex-row items-start justify-between py-1">
										<Text className="shrink-0 text-foreground-subtle">Position</Text>
										<Text className="max-w-[80%] truncate text-right">
											{belongsTo.series.position}
										</Text>
									</View>
								)}

								{seriesURL && (
									<View className="flex flex-row items-center justify-between py-1">
										<Text className="shrink-0 text-foreground-subtle">Feed URL</Text>
										<Pressable
											onPress={() =>
												router.push({
													pathname: `/opds/${serverID}/feed`,
													params: { url: seriesURL },
												})
											}
										>
											{({ pressed }) => (
												<View
													className={cn(
														'rounded-lg border border-edge bg-background-surface-secondary p-1 text-center',
														{
															'opacity-80': pressed,
														},
													)}
												>
													<Text>Go to feed</Text>
												</View>
											)}
										</Pressable>
									</View>
								)}
							</View>
						)}

						{!belongsTo?.series && (
							<View className="h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3">
								<View className="relative flex justify-center">
									<View className="flex items-center justify-center rounded-lg bg-background-surface p-2">
										<BookCopy className="h-6 w-6 text-foreground-muted" />
										<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
									</View>
								</View>

								<Text>No series information</Text>
							</View>
						)}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
