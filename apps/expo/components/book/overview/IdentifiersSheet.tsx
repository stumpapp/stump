import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { GlassView } from 'expo-glass-effect'
import { Fragment, useRef } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'

import { Card, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { DottedLine } from './DottedLine'
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
			<View className="mt-2 flex-row items-center gap-1">
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
								Identifiers
							</Text>
						</View>
					</GlassView>
				</Pressable>
				<DottedLine inverted />
			</View>

			<TrueSheet
				ref={sheetRef}
				detents={Platform.OS === 'android' ? [0.4, 1] : ['auto']}
				grabber
				scrollable
				backgroundColor={IS_IOS_24_PLUS ? undefined : colors.background.DEFAULT}
				grabberOptions={{ color: colors.sheet.grabber }}
			>
				<ScrollView className="flex-1 gap-2 px-4 py-6">
					<Card label="Identifiers">
						<InfoRow label="Stump" value={identifiers.stumpId} />
						{identifiers.amazon && <InfoRow label="Amazon" value={identifiers.amazon} />}
						{identifiers.calibre && <InfoRow label="Calibre" value={identifiers.calibre} />}
						{identifiers.google && <InfoRow label="Google" value={identifiers.google} />}
						{identifiers.isbn && <InfoRow label="ISBN" value={identifiers.isbn} />}
						{identifiers.mobiAsin && <InfoRow label="Mobi ASIN" value={identifiers.mobiAsin} />}
						{identifiers.uuid && <InfoRow label="UUID" value={identifiers.uuid} />}
					</Card>
				</ScrollView>
			</TrueSheet>
		</Fragment>
	)
}
