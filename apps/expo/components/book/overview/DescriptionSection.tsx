import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { GlassView } from 'expo-glass-effect'
import { Fragment, useRef, useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { stripHtml } from 'string-strip-html'

import { SheetBackDetection } from '~/components/SheetBackDetection'
import { Markdown, Text } from '~/components/ui'
import { useColors, usePalette } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import { DottedLine } from './DottedLine'

type Props = {
	description: string
}

export default function DescriptionSection({ description }: Props) {
	const { t } = useTranslate()

	const sheetRef = useRef<TrueSheet | null>(null)

	const colors = useColors()
	const textColor = usePalette('muted')

	const strippedDescription = stripHtml(description).result

	const [isOpen, setIsOpen] = useState(false)

	return (
		<Fragment>
			<View className="gap-4 px-2">
				<Text className="text-base leading-5 text-foreground-muted" numberOfLines={4}>
					{strippedDescription}
				</Text>

				<View className="gap-1 flex-row items-center">
					<DottedLine />
					<Pressable onPress={() => sheetRef.current?.present()}>
						<GlassView
							glassEffectStyle="regular"
							style={{ borderRadius: 999 }}
							isInteractive
							className="bg-background-surface"
						>
							<View className="px-4 py-2">
								<Text className="text-base font-semibold" style={{ color: textColor }}>
									{t('common.readMore')}
								</Text>
							</View>
						</GlassView>
					</Pressable>
					<DottedLine inverted />
				</View>
			</View>

			<TrueSheet
				ref={sheetRef}
				detents={[0.5, 1]}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => setIsOpen(false)}
			>
				<ScrollView className="p-6 flex-1">
					<Markdown>{strippedDescription}</Markdown>
				</ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={sheetRef} isOpen={isOpen} />
		</Fragment>
	)
}
