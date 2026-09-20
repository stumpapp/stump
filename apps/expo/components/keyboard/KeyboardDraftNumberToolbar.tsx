import { Portal } from '@rn-primitives/portal'
import { GlassView } from 'expo-glass-effect'
import { Pressable, View } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { DraftNumber } from './useDraftNumber'

export type KeyboardDraftNumberToolbarProps = {
	draft: DraftNumber
	onPress: () => void
	isSheetFooter?: boolean
	messages: {
		button: string
		invalidDefined: string
		undefined: string
	}
}

export function KeyboardDraftNumberToolbar({
	draft,
	onPress,
	isSheetFooter = false,
	messages,
}: KeyboardDraftNumberToolbarProps) {
	const colors = useColors()
	const { t } = useTranslate()
	const { progress, height } = useReanimatedKeyboardAnimation()

	const animatedStyle = useAnimatedStyle(() => {
		// down 60px when keyboard closed (more than h-14 = 49px): push toolbar off screen
		// up 7px when keyboard opened: add space between keyboard and toolbar
		const offset = interpolate(progress.value, [0, 1], [60, -7])
		return { transform: [{ translateY: (isSheetFooter ? 0 : height.value) + offset }] }
	}, [])

	const Container = isSheetFooter ? View : Portal

	return (
		<Container name="keyboard-toolbar">
			<Animated.View className="h-14 mx-4 bottom-0 left-0 right-0 absolute" style={animatedStyle}>
				<GlassView
					isInteractive
					className={cn(
						'inset-0 absolute rounded-full',
						!IS_IOS_26_PLUS && 'squircle bg-background-surface',
					)}
				>
					<View className="px-4 flex-1 flex-row items-center justify-between">
						<Text
							className="font-medium"
							style={{
								fontSize: 16,
								color: draft.isValid ? colors.foreground.DEFAULT : colors.fill.danger.DEFAULT,
							}}
						>
							{draft.isValid || draft.isEmpty
								? undefined
								: draft.number != undefined
									? messages.invalidDefined
									: messages.undefined}
						</Text>

						<Pressable onPress={onPress} hitSlop={10}>
							<Text className="font-medium" style={{ fontSize: 16 }}>
								{draft.isValid && !draft.isInitial ? messages.button : t('common.dismiss')}
							</Text>
						</Pressable>
					</View>
				</GlassView>
			</Animated.View>
		</Container>
	)
}
