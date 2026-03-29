import { Host, Image } from '@expo/ui/swift-ui'
import { GlassView } from 'expo-glass-effect'
import { Redo2, Undo2 } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'
import Animated, { Easing, Keyframe } from 'react-native-reanimated'

import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { useEpubLocationStore, useEpubTheme } from '~/stores/epub'

import { useEpubReaderContext } from './context'

// GlassView doesn't like zero opacity https://github.com/expo/expo/issues/41024
const enteringAnimation = new Keyframe({
	from: { opacity: 0.02 },
	to: { opacity: 1, easing: Easing.inOut(Easing.quad) },
}).duration(350)

const exitingAnimation = new Keyframe({
	from: { opacity: 1 },
	to: { opacity: 0.02, easing: Easing.inOut(Easing.quad) },
}).duration(350)

export default function JumpButton() {
	const { readerRef } = useEpubReaderContext()
	const { colors } = useEpubTheme()

	const jumpStack = useEpubLocationStore((state) => state.jumpStack)
	const popJump = useEpubLocationStore((state) => state.popJump)

	const hasJumps = jumpStack.length > 0
	const topEntry = jumpStack[0]
	const direction = topEntry?.direction
	const targetPosition = topEntry?.locator.locations?.position

	const handlePress = async () => {
		const entry = popJump()
		if (entry && readerRef) {
			await readerRef.goToLocation(entry.locator)
		}
	}

	if (!hasJumps) return null

	const isBack = direction === 'back'

	// Note: I don't _love_ this but just focused on getting it working for now. A few notes:
	// - I put it inside a glassview to make it more prominent, however I kinda like it _not_ in a button
	//   like how Libby/Apple Books does it (the arrow is in bubble, text is adjacent)
	// - I did not put "forward" jumps to the right, originally I had it left/right based on what the jump
	//   was, but generally worse UX in the scenario where I want to go more than 1 jump back/forward since
	//   the button would move around.
	// - I don't think this will work with a future redesign of the header/footer controls. I think it would be
	//   more like my first point re: more minimal
	// - I feel like loading takes WAY too long??? Maybe it is just in my emulator and exacerbated because I am
	//   jumping way more than I do while reading, but wanted to note it for future self to look into
	// - The timing of the controls exiting often interferes a little, I am ignoring that because I think in part
	//   it has been an annoyance only _because_ I am testing the button explicitly.
	return (
		<View className="absolute left-4">
			<Animated.View entering={enteringAnimation} exiting={exitingAnimation}>
				<Pressable onPress={handlePress}>
					<GlassView
						glassEffectStyle="regular"
						style={{ borderRadius: 999 }}
						isInteractive
						// this is for android only, but ios ignores it so it's fine
						// TODO: use theme color
						className="bg-background-surface"
					>
						<View className="flex-row items-center gap-2 px-4 py-2">
							{Platform.select({
								ios: (
									<Host matchContents>
										<Image
											systemName={isBack ? 'arrow.uturn.left' : 'arrow.uturn.right'}
											size={12}
											color={colors?.foreground}
										/>
									</Host>
								),
								android: <Icon as={isBack ? Undo2 : Redo2} size={12} color={colors?.foreground} />,
							})}
							{targetPosition != null && (
								<Text className="text-sm font-medium" style={{ color: colors?.foreground }}>
									{targetPosition}
								</Text>
							)}
						</View>
					</GlassView>
				</Pressable>
			</Animated.View>
		</View>
	)
}
