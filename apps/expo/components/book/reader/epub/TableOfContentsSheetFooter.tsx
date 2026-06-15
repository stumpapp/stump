import { GlassView } from 'expo-glass-effect'
import { Pressable, View } from 'react-native'
import {
	KeyboardController,
	useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { IS_IOS_26_PLUS, useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'
import { useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

import { useEpubReaderContext } from './context'
import { GoToPage } from './TableOfContentsSheet'

export default function TableOfContentsSheetFooter({ goToPage }: { goToPage: GoToPage }) {
	const colors = useColors()

	const { readerRef } = useEpubReaderContext()

	const positions = useEpubLocationStore((store) => store.positions)
	const pushJump = useEpubLocationStore((state) => state.pushJump)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const handleGoToPage = async () => {
		if (!goToPage.isValid || goToPage.number == undefined) {
			goToPage.reset()
			KeyboardController.dismiss()
			return
		}

		const pageLocator = positions[goToPage.number - 1]
		if (pageLocator) {
			pushJump(pageLocator)
			await readerRef?.goToLocation(pageLocator)
			closeSheet('tableOfContents')
			goToPage.reset()
		}
	}

	const { progress } = useReanimatedKeyboardAnimation()

	const footerAnimatedStyle = useAnimatedStyle(() => {
		const footerOffset = interpolate(
			progress.value,
			[0, 1],
			// down 60px when keyboard closed (more than h-14 = 49px): push footer toolbar off screen
			// up 7px when keyboard opened: add space between keyboard and footer toolbar
			[60, -7],
		)

		return { transform: [{ translateY: footerOffset }] }
	}, [])

	return (
		<Animated.View className="h-14 mx-4" style={footerAnimatedStyle}>
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
							color: goToPage.isValid ? colors.foreground.DEFAULT : colors.fill.danger.DEFAULT,
						}}
					>
						{goToPage.isValid || goToPage.isEmpty
							? undefined
							: goToPage.number != undefined
								? `Page ${goToPage.number} does not exist`
								: `'${goToPage.string}' is not a page number`}
					</Text>

					<Pressable onPress={handleGoToPage} hitSlop={10}>
						<Text className="font-medium" style={{ fontSize: 16 }}>
							{goToPage.isValid ? `Go to page ${goToPage.number}` : 'Dismiss'}
						</Text>
					</Pressable>
				</View>
			</GlassView>
		</Animated.View>
	)
}
