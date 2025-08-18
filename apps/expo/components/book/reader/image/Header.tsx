import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Heading, icons } from '~/components/ui'
import { COLORS } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

const { X, CircleEllipsis } = icons

type Props = {
	onShowGlobalSettings: () => void
}

// TODO: Remove hardcoded disabled values and support vertical continuous scrolling

export default function Header({ onShowGlobalSettings }: Props) {
	const { height } = useDisplay()
	const { book, currentPage, resetTimer, flatListRef } = useImageBasedReader()
	const {
		preferences: { readingDirection, readingMode, trackElapsedTime },
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences({ book })

	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const visible = useReaderStore((state) => state.showControls)

	const translateY = useSharedValue(-400)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : 400 * -1, {
			duration: 200,
		})
	}, [visible, translateY, height, insets.top])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: insets.top,
			left: insets.left,
			right: insets.right,
			transform: [{ translateY: translateY.value }],
		}
	})

	const onChangeReadingDirection = useCallback(() => {
		setBookPreferences({
			readingDirection:
				readingDirection === ReadingDirection.Ltr ? ReadingDirection.Rtl : ReadingDirection.Ltr,
		})
		flatListRef.current?.scrollToIndex({ index: (currentPage || 1) - 1, animated: false })
	}, [currentPage, readingDirection, setBookPreferences, flatListRef])

	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<Animated.View className="absolute z-20 gap-2 px-2" style={animatedStyles}>
			<View className="flex-row items-center justify-between">
				<Pressable
					onPress={() => router.back()}
					style={{
						zIndex: 100,
					}}
				>
					{({ pressed }) => (
						<View
							className="rounded-full border p-1 tablet:p-2"
							style={{
								backgroundColor: COLORS.dark.background.overlay.DEFAULT,
								borderColor: COLORS.dark.edge.DEFAULT,
							}}
						>
							<X
								style={{
									opacity: pressed ? 0.85 : 1,
									// @ts-expect-error: This is fine
									color: COLORS.dark.foreground.DEFAULT,
								}}
							/>
						</View>
					)}
				</Pressable>

				<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
					<DropdownMenu.Trigger>
						<Pressable
							onPress={() => setIsOpen((prev) => !prev)}
							style={{
								zIndex: 100,
							}}
						>
							{({ pressed }) => (
								<View
									className="rounded-full border p-1 tablet:p-2"
									style={{
										backgroundColor: COLORS.dark.background.overlay.DEFAULT,
										borderColor: COLORS.dark.edge.DEFAULT,
									}}
								>
									<CircleEllipsis
										style={{
											opacity: isOpen ? 0.5 : pressed ? 0.85 : 1,
											// @ts-expect-error: This is fine
											color: COLORS.dark.foreground.DEFAULT,
										}}
									/>
								</View>
							)}
						</Pressable>
					</DropdownMenu.Trigger>

					<DropdownMenu.Content>
						<DropdownMenu.Group>
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger key="preset">
									<DropdownMenu.ItemTitle>Presets</DropdownMenu.ItemTitle>
								</DropdownMenu.SubTrigger>

								<DropdownMenu.SubContent>
									<DropdownMenu.CheckboxItem
										key="standard"
										value={readingMode === ReadingMode.Paged}
										onValueChange={() => setBookPreferences({ readingMode: ReadingMode.Paged })}
									>
										<DropdownMenu.ItemTitle>Paged</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>
									<DropdownMenu.CheckboxItem
										key="vscroll"
										value={readingMode === ReadingMode.ContinuousVertical}
										onValueChange={() =>
											setBookPreferences({ readingMode: ReadingMode.ContinuousVertical })
										}
										disabled
									>
										<DropdownMenu.ItemTitle>Vertical Scroll</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>

									<DropdownMenu.CheckboxItem
										key="hscroll"
										value={readingMode === ReadingMode.ContinuousHorizontal}
										onValueChange={() =>
											setBookPreferences({ readingMode: ReadingMode.ContinuousHorizontal })
										}
									>
										<DropdownMenu.ItemTitle>Horizontal Scroll</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>

							<DropdownMenu.CheckboxItem
								key="incognito"
								value={!!incognito}
								onValueChange={() => updateGlobalSettings({ incognito: !incognito })}
							>
								<DropdownMenu.ItemIndicator />
								<DropdownMenu.ItemTitle>Incognito</DropdownMenu.ItemTitle>
								<DropdownMenu.ItemIcon
									ios={{ name: incognito ? 'eyeglasses.slash' : 'eyeglasses' }}
								/>
							</DropdownMenu.CheckboxItem>

							<DropdownMenu.Item key="readingDirection" onSelect={onChangeReadingDirection}>
								<DropdownMenu.ItemTitle>Reading Direction</DropdownMenu.ItemTitle>
								<DropdownMenu.ItemIcon
									ios={{
										name:
											readingDirection === ReadingDirection.Ltr
												? 'inset.filled.righthalf.arrow.right.rectangle'
												: 'inset.filled.lefthalf.arrow.left.rectangle',
									}}
								/>
							</DropdownMenu.Item>

							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger key="preset">
									<DropdownMenu.ItemTitle>Reading Timer</DropdownMenu.ItemTitle>
									<DropdownMenu.ItemIcon
										ios={{
											name: 'timer',
										}}
									/>
								</DropdownMenu.SubTrigger>

								<DropdownMenu.SubContent>
									<DropdownMenu.CheckboxItem
										key="enabled"
										value={!!trackElapsedTime}
										onValueChange={() =>
											setBookPreferences({ trackElapsedTime: !trackElapsedTime })
										}
									>
										<DropdownMenu.ItemTitle>Enabled</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>
									<DropdownMenu.Item
										key="reset"
										destructive
										disabled={!trackElapsedTime || !resetTimer}
										onSelect={resetTimer}
									>
										<DropdownMenu.ItemTitle>Reset Timer</DropdownMenu.ItemTitle>
									</DropdownMenu.Item>
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
						</DropdownMenu.Group>

						<DropdownMenu.Group>
							<DropdownMenu.Item key="globalSettings" onSelect={onShowGlobalSettings}>
								<DropdownMenu.ItemTitle>Preferences</DropdownMenu.ItemTitle>
								<DropdownMenu.ItemIcon
									ios={{
										name: 'slider.horizontal.2.square.on.square',
									}}
								/>
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</View>

			<Heading
				className="font-semibold tablet:text-3xl"
				numberOfLines={2}
				ellipsizeMode="tail"
				style={{
					color: COLORS.dark.foreground.DEFAULT,
				}}
			>
				{book.name}
			</Heading>
		</Animated.View>
	)
}
