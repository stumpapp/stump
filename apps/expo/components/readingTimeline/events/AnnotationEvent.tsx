import { GlassView } from 'expo-glass-effect'
import { Highlighter, PencilLine } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'

import { fakeData } from '../fakeData'

type Props = {
	event: Extract<
		(typeof fakeData.readthroughs)[number]['sessions'][number]['events'][number],
		{ __typename: 'MediaAnnotation' }
	>
}

// TODO: prolly sm less boring than "{action verb} {location}" ? preview for higlighted text + annotation text? in sheet?

export function AnnotationEvent({ event }: Props) {
	const colors = useColors()

	const as = event.annotationText == null ? Highlighter : PencilLine

	return (
		<View className="gap-6 flex flex-row items-center">
			<View className="squircle h-12 w-12 bg-black/5 dark:bg-white/10 flex shrink-0 items-center justify-center rounded-2xl">
				{/*<LinearGradient
				{...gradient}
			useAngle
				angle={195}
				style={{ position: 'absolute', inset: 0 }}
			/>*/}
				<Icon as={as} size={18} strokeWidth={1.8} absoluteStrokeWidth />
				<View className="inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-xl border-[0.75px]" />
			</View>

			<View className="flex-1" />

			<Pressable>
				<GlassView
					glassEffectStyle="regular"
					style={{ borderRadius: 999 }}
					// tintColor={colors.fill.brand.secondary}
					isInteractive
					className="bg-fill-brand-secondary"
				>
					<View className="px-3 py-2">
						<Text className="text-base font-semibold">Show</Text>
					</View>
				</GlassView>
			</Pressable>
		</View>
	)
}
