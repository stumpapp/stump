import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSDK } from '@stump/client'
import { isPseStreamLink, OPDSLegacyEntry } from '@stump/sdk'
import { intlFormat } from 'date-fns'
import { forwardRef } from 'react'
import { Image, Platform, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TImage from 'react-native-turbo-image'
import { stripHtml } from 'string-strip-html'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import {
	DescriptionSection,
	IdentifiersSheet,
	InfoRow,
	useOverviewAnimations,
} from '../book/overview'
import { useFileExplorerAssets } from '../fileExplorer'
import { ThumbnailImage, TurboImage } from '../image'
import { useResolveURL } from '../opds/utils'
import { MetadataBadgeSection } from '../overview'
import { Card, Heading } from '../ui'
import { getIconSource } from './OPDSLegacyEntryItem'

type Props = {
	entry: OPDSLegacyEntry
}

export const OPDSLegacyEntryItemSheet = forwardRef<TrueSheet, Props>(
	function OPDSLegacyEntryItemSheet({ entry }, ref) {
		const {
			activeServer: { name: serverName },
		} = useActiveServer()
		const { colorScheme } = useColorScheme()
		const { sdk } = useSDK()

		const colors = useColors()
		const insets = useSafeAreaInsets()
		const assets = useFileExplorerAssets()
		const iconSource = getIconSource(entry, colorScheme, assets)
		const resolveUrl = useResolveURL()

		const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)
		const { animatedScrollRef, parallaxStyle } = useOverviewAnimations()

		const thumbnailUrl = entry.links.find(
			(link) => link.rel === 'http://opds-spec.org/image/thumbnail',
		)?.href
		const resolvedThumbnailUrl = thumbnailUrl ? resolveUrl(thumbnailUrl) : undefined
		const pseLink = entry.links.find(isPseStreamLink)
		const pageCount = pseLink?.['pse:count']
		const currentPage = pseLink?.['pse:lastRead']

		const description = entry.content ? stripHtml(entry.content).result : null

		return (
			<TrueSheet
				ref={ref}
				detents={[1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				style={{
					paddingBottom: insets.bottom,
				}}
			>
				<Animated.ScrollView ref={animatedScrollRef}>
					<View className="overflow-hidden pb-16">
						{resolvedThumbnailUrl && (
							<Animated.View
								className="absolute -inset-12 opacity-70 dark:opacity-30"
								style={parallaxStyle}
							>
								<TImage
									source={{
										uri: resolvedThumbnailUrl,
										headers: {
											...sdk.customHeaders,
											Authorization: sdk.authorizationHeader || '',
										},
									}}
									style={{ width: '100%', height: '100%' }}
									resizeMode="cover"
									fadeDuration={2000}
									{...(Platform.OS === 'ios' && { indicator: { color: 'transparent' } })}
									resize={60}
									blur={Platform.OS === 'ios' ? 7 : 16}
								/>
							</Animated.View>
						)}

						<View className="items-center gap-4 px-4 pb-8 pt-8">
							{!thumbnailUrl &&
								Platform.select({
									ios: (
										<TurboImage
											source={{ uri: iconSource.localUri || iconSource.uri }}
											style={{ width: 120, height: 120 }}
										/>
									),
									android: (
										<Image
											// @ts-expect-error: It's fine
											source={iconSource}
											style={{ width: 120, height: 120 }}
										/>
									),
								})}

							{resolvedThumbnailUrl && (
								<ThumbnailImage
									source={{
										uri: resolvedThumbnailUrl,
										headers: {
											...sdk.customHeaders,
											Authorization: sdk.authorizationHeader || '',
										},
									}}
									size={{ height: 200 / thumbnailRatio, width: 200 }}
									borderAndShadowStyle={{ shadowRadius: 5 }}
								/>
							)}

							<Heading size="lg" className="text-center leading-6" numberOfLines={3}>
								{entry.title}
							</Heading>
						</View>
					</View>

					<View className="ios:rounded-[3rem] ios:-mt-[4.5rem] -mt-[2.5rem] gap-4 rounded-[2.5rem] bg-background px-4 py-6">
						{(pageCount != null || currentPage != null) && (
							<Card>
								<Card.StatGroup>
									{pageCount != null && <Card.Stat label="Pages" value={pageCount} />}
									{currentPage != null && <Card.Stat label="Current Page" value={currentPage} />}
								</Card.StatGroup>
							</Card>
						)}

						{!!description && <DescriptionSection description={description} />}

						<MetadataBadgeSection
							label="Authors"
							items={[...new Set(entry.authors?.map((author) => ({ label: author.name })) || [])]}
						/>

						<Card label="Details">
							<InfoRow label="Server" value={serverName} />
							{entry.updated && (
								<InfoRow
									label="Updated"
									value={intlFormat(new Date(entry.updated), {
										month: 'long',
										day: 'numeric',
										year: 'numeric',
									})}
								/>
							)}
						</Card>

						<IdentifiersSheet identifiers={{ identifier: entry.id }} />
					</View>
				</Animated.ScrollView>
			</TrueSheet>
		)
	},
)
