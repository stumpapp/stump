import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { GlassView } from 'expo-glass-effect'
import { Fragment, useRef } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'
import { stripHtml } from 'string-strip-html'

import { Markdown, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { DottedLine } from './DottedLine'

type Props = {
	description: string
}

export default function DescriptionSection({ description }: Props) {
	const sheetRef = useRef<TrueSheet | null>(null)

	const colors = useColors()

	const strippedDescription = stripHtml(description).result

	return (
		<Fragment>
			<View className="gap-4 px-2">
				<Text className="text-base leading-5 text-foreground-muted" numberOfLines={4}>
					{strippedDescription}
				</Text>

				<View className="flex-row items-center gap-1">
					<DottedLine />
					<Pressable onPress={() => sheetRef.current?.present()}>
						<GlassView
							glassEffectStyle="regular"
							style={{ borderRadius: 999 }}
							isInteractive
							className="bg-background-surface"
						>
							<View className="px-4 py-2">
								<Text
									className="text-base font-semibold"
									style={{ color: colors.fill.brand.DEFAULT }}
								>
									Read more
								</Text>
							</View>
						</GlassView>
					</Pressable>
					<DottedLine inverted />
				</View>
			</View>

			<TrueSheet
				ref={sheetRef}
				detents={Platform.OS === 'android' ? [0.5, 1] : ['auto']}
				grabber
				scrollable
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
			>
				<ScrollView className="flex-1 p-6">
					<Markdown>{strippedDescription}</Markdown>
				</ScrollView>
			</TrueSheet>
		</Fragment>
	)
}
