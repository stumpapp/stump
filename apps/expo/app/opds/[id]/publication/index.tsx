import { useSDK } from '@stump/client'
import { useRouter } from 'expo-router'
import { BookCopy, Info, Slash } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useActiveServer } from '~/components/activeServer'
import { InfoRow, InfoSection } from '~/components/book/overview'
import { BorderAndShadow } from '~/components/BorderAndShadow'
import ChevronBackLink from '~/components/ChevronBackLink'
import { TurboImage } from '~/components/Image'
import {
	getDateField,
	getNumberField,
	getPublicationThumbnailURL,
	getStringField,
} from '~/components/opds/utils'
import { Button, Icon, Text } from '~/components/ui'
import { useDynamicHeader } from '~/lib/hooks/useDynamicHeader'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

import { usePublicationContext } from './context'

export default function Screen() {
	const { sdk } = useSDK()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const {
		publication: { metadata, images, readingOrder, links, resources },
		url,
	} = usePublicationContext()
	const { title, identifier, belongsTo } = metadata || {}

	const router = useRouter()
	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	useDynamicHeader({
		title: title || 'Publication',
		headerLeft: Platform.OS === 'ios' ? () => <ChevronBackLink /> : undefined,
	})

	// TODO: once I sort out progress sync, prefetch the current page
	// TODO: prefetch the first page of the publication, see https://github.com/candlefinance/faster-image/issues/73
	// const firstPageURL = readingOrder?.[0]?.href
	// useEffect(() => {
	// 	if (firstPageURL) {
	// 		EImage.prefetch(firstPageURL, {
	// 			headers: {
	// 				Authorization: sdk.authorizationHeader || '',
	// 			},
	// 		})
	// 	}
	// }, [sdk, firstPageURL])

	const thumbnailURL = getPublicationThumbnailURL({
		images,
		readingOrder,
		resources,
	})

	const numberOfPages = getNumberField(metadata, 'numberOfPages') ?? readingOrder?.length
	const modified = getDateField(metadata, 'modified')
	const description = getStringField(metadata, 'description')

	const hasInformation = !!numberOfPages || !!modified

	const belongsToSeries = Array.isArray(belongsTo?.series) ? belongsTo.series[0] : belongsTo?.series
	const seriesURL = belongsToSeries?.links?.find((link) => link.rel === 'self')?.href

	const downloadURL = links?.find((link) => link.rel === 'http://opds-spec.org/acquisition')?.href
	const canStream = !!readingOrder && readingOrder.length > 0
	const isSupportedStream = readingOrder?.every((link) => link.type?.startsWith('image/'))

	// TODO: dump the rest of the metadata? Or enforce servers to conform to a standard?
	// const restMeta = omit(rest, ['numberOfPages', 'modified'])

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['left', 'right']}
		>
			<ScrollView
				className="flex-1 gap-5 bg-background px-4 tablet:px-6"
				contentInsetAdjustmentBehavior="automatic"
			>
				<View className="flex-1 gap-8 py-4">
					<View className="flex items-center gap-4">
						<BorderAndShadow
							style={{ borderRadius: 10, borderWidth: 0.4, shadowRadius: 5, elevation: 8 }}
						>
							<TurboImage
								source={{
									uri: thumbnailURL || '',
									headers: {
										...sdk.customHeaders,
										Authorization: sdk.authorizationHeader || '',
									},
								}}
								resizeMode="stretch"
								resize={235 * 1.5}
								style={{ height: 235 / thumbnailRatio, width: 235 }}
							/>
						</BorderAndShadow>
					</View>

					<View className="flex w-full flex-row items-center gap-2 tablet:max-w-sm tablet:self-center">
						<Button
							className="flex-1 border border-edge"
							onPress={() =>
								router.push({
									pathname: `/opds/[id]/publication/read`,
									params: { url, id: serverID },
								})
							}
							disabled={!canStream || !isSupportedStream}
						>
							<Text>Stream</Text>
						</Button>
						<Button variant="secondary" disabled={!downloadURL}>
							<Text>Download</Text>
						</Button>
					</View>

					{!canStream && (
						<View className="squircle rounded-lg bg-fill-info-secondary p-3">
							<Text>This publication lacks a defined reading order and cannot be streamed</Text>
						</View>
					)}

					{!isSupportedStream && (
						<View className="squircle rounded-lg bg-fill-info-secondary p-3">
							<Text>
								This publication contains unsupported media types and cannot be streamed yet
							</Text>
						</View>
					)}

					<InfoSection
						label="Information"
						rows={[
							...(identifier
								? [<InfoRow key="identifier" label="Identifier" value={identifier} longValue />]
								: []),
							<InfoRow key="title" label="Title" value={title} longValue />,
							...(description
								? [<InfoRow key="description" label="Description" value={description} longValue />]
								: []),
							...(modified
								? [
										<InfoRow
											key="modified"
											label="Modified"
											value={modified.format('MMMM DD, YYYY')}
											longValue
										/>,
									]
								: []),
							...(numberOfPages
								? [
										<InfoRow
											key="numberOfPages"
											label="Number of pages"
											value={numberOfPages.toString()}
											longValue
										/>,
									]
								: []),
							...(!hasInformation
								? [
										<View
											key="noInformation"
											className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3"
										>
											<View className="relative flex justify-center">
												<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
													<Icon as={Info} className="h-6 w-6 text-foreground-muted" />
													<Icon
														as={Slash}
														className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
													/>
												</View>
											</View>

											<Text>No information available</Text>
										</View>,
									]
								: []),
						]}
					/>

					<InfoSection
						label="Series"
						rows={[
							...(!belongsTo?.series
								? [
										<View
											key="noSeries"
											className="squircle h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-edge p-3"
										>
											<View className="relative flex justify-center">
												<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
													<Icon as={BookCopy} className="h-6 w-6 text-foreground-muted" />
													<Icon
														as={Slash}
														className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80"
													/>
												</View>
											</View>

											<Text>No series information</Text>
										</View>,
									]
								: []),
							...(belongsToSeries?.name
								? [<InfoRow key="seriesName" label="Name" value={belongsToSeries.name} />]
								: []),
							...(belongsToSeries?.position
								? [
										<InfoRow
											key="seriesPosition"
											label="Position"
											value={belongsToSeries.position.toString()}
										/>,
									]
								: []),
							...(seriesURL
								? [
										<View
											key="seriesURL"
											className="flex flex-row items-center justify-between py-1"
										>
											<Text className="shrink-0 text-foreground-subtle">Feed URL</Text>
											<Pressable
												onPress={() =>
													router.push({
														pathname: '/opds/[id]/feed',
														params: { url: seriesURL, id: serverID },
													})
												}
											>
												{({ pressed }) => (
													<View
														className={cn(
															'squircle rounded-lg border border-edge bg-background-surface-secondary p-1 text-center',
															{
																'opacity-80': pressed,
															},
														)}
													>
														<Text>Go to feed</Text>
													</View>
												)}
											</Pressable>
										</View>,
									]
								: []),
						]}
					/>
				</View>
			</ScrollView>
		</SafeAreaView>
	)
}
