import { GlassView } from 'expo-glass-effect'
import { useRouter } from 'expo-router'
import { ComponentPropsWithoutRef } from 'react'
import { Pressable, View } from 'react-native'

import { useColors } from '~/lib/constants'

import { useActiveServer } from '../activeServer'
import { Text } from '../ui'

type Props = {
	url: string
	label?: string
} & Omit<ComponentPropsWithoutRef<typeof Pressable>, 'children' | 'onPress'>

export default function FeedSelfURL({ label = 'See more', url }: Props) {
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const colors = useColors()

	// Note: I kinda liked the pop of color and glass here but not 100% sure yet, see what folks think
	return (
		<Pressable
			onPress={() =>
				router.push({
					pathname: '/opds/[id]/feed/[url]',
					params: {
						id: serverID,
						url,
					},
				})
			}
		>
			<GlassView
				glassEffectStyle="regular"
				style={{ borderRadius: 999 }}
				tintColor={colors.fill.brand.secondary}
				isInteractive
				className="bg-fill-brand-secondary"
			>
				<View className="px-3 py-2">
					<Text className="text-base font-semibold" style={{ color: colors.fill.brand.DEFAULT }}>
						{label}
					</Text>
				</View>
			</GlassView>
		</Pressable>
	)
}
