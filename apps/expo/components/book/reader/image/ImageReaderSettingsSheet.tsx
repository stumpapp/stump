import { TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet'
import { getColor, serialize } from 'colorjs.io/fn'
import { useContext, useRef } from 'react'
import { ScrollView, View } from 'react-native'

import { Heading, Switch, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore, useReaderStore } from '~/stores'

import { ReaderSettings } from '../settings'
import { ImageBasedReaderContext } from './context'

export default function ImageReaderSettingsSheet(props: TrueSheetProps) {
	const context = useContext(ImageBasedReaderContext)
	const { t } = useTranslate()
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()

	const bookOverrides = useReaderStore((state) => state.bookOverrides)
	const setBookOverride = useReaderStore((state) => state.setBookOverride)
	const { accentColor } = usePreferencesStore()

	const ref = useRef<TrueSheet | null>(null)

	const bookId = context?.book?.id
	const serverId = context?.serverId
	const overrideGlobalSettings = !!(bookId ? bookOverrides[bookId] : false)

	const color = getColor(accentColor || colors.fill.brand.DEFAULT)
	color.alpha = isDarkColorScheme ? 0.1 : 0.2
	const backgroundColor = serialize(color, { format: 'hex' })

	return (
		<TrueSheet
			name="imageReaderSettings"
			ref={ref}
			detents={[0.5, 1]}
			grabber
			scrollable
			backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
			grabberOptions={{ color: colors.sheet.grabber }}
			insetAdjustment="automatic"
			style={{
				// add a slight tint if global settings are not used
				// this visually helps to confirm the switch did something if no settings change
				backgroundColor: overrideGlobalSettings ? backgroundColor : undefined,
			}}
			{...props}
		>
			<ScrollView
				className="p-6 flex-1"
				contentContainerStyle={{ alignItems: 'flex-start' }}
				nestedScrollEnabled
			>
				<View className="gap-8 w-full flex-1">
					<View className="flex flex-row items-center justify-between">
						<Heading size="lg">{t('common.settings')}</Heading>

						{!!context && (
							<View className="gap-1 flex-row items-center">
								<Text className="text-foreground-muted">
									{t('readerSettings.overrideGlobalSettings')}
								</Text>
								<Switch
									checked={overrideGlobalSettings}
									onCheckedChange={(checked) => {
										if (bookId) {
											setBookOverride(bookId, checked)
										}
									}}
								/>
							</View>
						)}
					</View>

					<ReaderSettings
						{...(overrideGlobalSettings && bookId && serverId
							? {
									forBook: bookId,
									forServer: serverId,
								}
							: {})}
					/>
				</View>
			</ScrollView>
		</TrueSheet>
	)
}
