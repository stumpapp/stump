import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { GlassView } from 'expo-glass-effect'
import { Fragment, useRef } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'

import { Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import InfoRow from './InfoRow'

type Identifiers = {
	stumpId: string
	amazon?: string | null
	calibre?: string | null
	google?: string | null
	isbn?: string | null
	mobiAsin?: string | null
	uuid?: string | null
}

type Props = {
	identifiers: Identifiers
}

export default function IdentifiersSheet({ identifiers }: Props) {
	const sheetRef = useRef<TrueSheet | null>(null)

	const colors = useColors()

	return (
		<Fragment>
			<View className="mt-2 flex-row items-center">
				<View className="flex-1 border-t border-dashed border-edge opacity-70" />
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
								Identifiers
							</Text>
						</View>
					</GlassView>
				</Pressable>
				<View className="flex-1 border-t border-dashed border-edge opacity-70" />
			</View>

			<TrueSheet
				ref={sheetRef}
				detents={Platform.OS === 'android' ? [0.4, 1] : ['auto']}
				grabber
				scrollable
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
			>
				<ScrollView className="flex-1 gap-2 p-6">
					<Text className="pb-2 text-lg font-semibold text-foreground">Identifiers</Text>

					<View className="squircle ios:rounded-[2rem] overflow-hidden rounded-3xl bg-black/5 dark:bg-white/10">
						<InfoRow label="Stump" value={identifiers.stumpId} />
						{identifiers.amazon && <InfoRow label="Amazon" value={identifiers.amazon} />}
						{identifiers.calibre && <InfoRow label="Calibre" value={identifiers.calibre} />}
						{identifiers.google && <InfoRow label="Google" value={identifiers.google} />}
						{identifiers.isbn && <InfoRow label="ISBN" value={identifiers.isbn} />}
						{identifiers.mobiAsin && <InfoRow label="Mobi ASIN" value={identifiers.mobiAsin} />}
						{identifiers.uuid && <InfoRow label="UUID" value={identifiers.uuid} />}
					</View>
				</ScrollView>
			</TrueSheet>
		</Fragment>
	)
}
