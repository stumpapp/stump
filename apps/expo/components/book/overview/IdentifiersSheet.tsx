import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { GlassView } from 'expo-glass-effect'
import { Fragment, useRef } from 'react'
import { Platform, Pressable, ScrollView, View } from 'react-native'

import { Card, Text } from '~/components/ui'
import { IS_IOS_24_PLUS, useColors } from '~/lib/constants'

import { DottedLine } from './DottedLine'

type Identifiers = {
	identifier?: string | null
	stumpId?: string | null
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
						{identifiers.stumpId && <Card.Row label="Stump" value={identifiers.stumpId} />}
						{identifiers.identifier && (
							<Card.Row label="Identifier" value={identifiers.identifier} />
						)}
						{identifiers.amazon && <Card.Row label="Amazon" value={identifiers.amazon} />}
						{identifiers.calibre && <Card.Row label="Calibre" value={identifiers.calibre} />}
						{identifiers.google && <Card.Row label="Google" value={identifiers.google} />}
						{identifiers.isbn && <Card.Row label="ISBN" value={identifiers.isbn} />}
						{identifiers.mobiAsin && <Card.Row label="Mobi ASIN" value={identifiers.mobiAsin} />}
						{identifiers.uuid && <Card.Row label="UUID" value={identifiers.uuid} />}
					</Card>
				</ScrollView>
			</TrueSheet>
		</Fragment>
	)
}
