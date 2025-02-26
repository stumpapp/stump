import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { Heading, icons } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'
import { invertReadingDirection } from './utils'

const { X, CircleEllipsis } = icons

type Props = {
	onShowGlobalSettings: () => void
}

export default function Header({ onShowGlobalSettings }: Props) {
	const { height } = useDisplay()
	const {
		book: { name, id, pages },
		currentPage,
		resetTimer,
		flatListRef,
	} = useImageBasedReader()
	const {
		preferences: { readingDirection, readingMode, trackElapsedTime },
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences(id)

	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const visible = useReaderStore((state) => state.showControls)

	const translateY = useSharedValue(0)
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
		const converted = invertReadingDirection({
			direction: readingDirection,
			page: currentPage || 1,
			totalPages: pages,
		})
		setBookPreferences({ readingDirection: converted.direction })
		flatListRef.current?.scrollToIndex({ index: converted.page - 1, animated: false })
	}, [currentPage, pages, readingDirection, setBookPreferences, flatListRef])

	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<Animated.View className="absolute z-20 gap-2 px-2" style={animatedStyles}>
			<View className="flex-row items-center justify-between">
				<Pressable onPress={() => router.back()}>
					{({ pressed }) => (
						<View className="rounded-full border border-edge bg-background-overlay p-1 tablet:p-2">
							<X className="text-foreground" style={{ opacity: pressed ? 0.85 : 1 }} />
						</View>
					)}
				</Pressable>

				<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
					<DropdownMenu.Trigger>
						<Pressable onPress={() => setIsOpen((prev) => !prev)}>
							{({ pressed }) => (
								<View className="rounded-full border border-edge bg-background-overlay p-1 tablet:p-2">
									<CircleEllipsis
										className="text-foreground"
										style={{ opacity: isOpen ? 0.5 : pressed ? 0.85 : 1 }}
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
										value={readingMode === 'paged'}
										onValueChange={() => setBookPreferences({ readingMode: 'paged' })}
									>
										<DropdownMenu.ItemTitle>Paged</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>
									<DropdownMenu.CheckboxItem
										key="vscroll"
										value={readingMode === 'continuous:vertical'}
										onValueChange={() => setBookPreferences({ readingMode: 'continuous:vertical' })}
									>
										<DropdownMenu.ItemTitle>Vertical Scroll</DropdownMenu.ItemTitle>
									</DropdownMenu.CheckboxItem>

									<DropdownMenu.CheckboxItem
										key="hscroll"
										value={readingMode === 'continuous:horizontal'}
										onValueChange={() =>
											setBookPreferences({ readingMode: 'continuous:horizontal' })
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
											readingDirection === 'ltr'
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

			<Heading className="font-semibold tablet:text-3xl" numberOfLines={2} ellipsizeMode="tail">
				{name}
			</Heading>
		</Animated.View>
	)
}
