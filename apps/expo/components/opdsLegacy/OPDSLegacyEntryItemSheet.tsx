import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useSDK } from '@stump/client'
import { isPseStreamLink, OPDSLegacyEntry } from '@stump/sdk'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import { forwardRef } from 'react'
import { Image, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { stripHtml } from 'string-strip-html'

import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { useActiveServer } from '../activeServer'
import { useFileExplorerAssets } from '../fileExplorer'
import { ThumbnailImage, TurboImage } from '../image'
import { useResolveURL } from '../opds/utils'
import { InfoRow, LongValue, MetadataBadgeSection } from '../overview'
import { CardList, Heading } from '../ui'
import { getIconSource } from './OPDSLegacyEntryItem'

dayjs.extend(localizedFormat)

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

		const thumbnailUrl = entry.links.find(
			(link) => link.rel === 'http://opds-spec.org/image/thumbnail',
		)?.href
		const pseLink = entry.links.find(isPseStreamLink)
		const pageCount = pseLink?.['pse:count']
		const currentPage = pseLink?.['pse:lastRead']

		const showMetadata = Boolean(!!entry.content || pageCount != null || currentPage != null)

		return (
			<TrueSheet
				ref={ref}
				detents={['auto', 1]}
				cornerRadius={24}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				style={{
					paddingTop: 12,
					paddingBottom: insets.bottom,
				}}
			>
				<View className="flex-1 gap-8 p-6">
					<View className="flex-row items-center gap-4">
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

						{thumbnailUrl && (
							<ThumbnailImage
								source={{
									uri: resolveUrl(thumbnailUrl),
									headers: {
										...sdk.customHeaders,
										Authorization: sdk.authorizationHeader || '',
									},
								}}
								resizeMode="stretch"
								size={{ height: 110 / thumbnailRatio, width: 110 }}
							/>
						)}

						<View className="flex-1 justify-center gap-1">
							<Heading size="lg" numberOfLines={3}>
								{entry.title}
							</Heading>
						</View>
					</View>

					{showMetadata && (
						<CardList label="Metadata">
							{entry.content && (
								<LongValue label="Content" value={stripHtml(entry.content).result} />
							)}
							{pageCount != null && <InfoRow label="Pages" value={pageCount.toString()} />}
							{currentPage != null && (
								<InfoRow label="Current Page" value={currentPage.toString()} />
							)}
						</CardList>
					)}

					<MetadataBadgeSection
						label="Authors"
						items={entry.authors?.map((author) => author.name) || []}
					/>

					<CardList label="Technical Info">
						<InfoRow label="Identifier" value={entry.id} />
						<InfoRow label="Server" value={serverName} />
						<InfoRow label="Updated" value={dayjs(entry.updated).format('LLL')} />
					</CardList>
				</View>
			</TrueSheet>
		)
	},
)
