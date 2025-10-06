import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { useRouter } from 'expo-router'
import {
	CircleEllipsis,
	Glasses,
	Settings2,
	SquareArrowLeft,
	SquareArrowRight,
	X,
} from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { Platform, View } from 'react-native'
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Heading,
	Switch,
	Text,
} from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { COLORS } from '~/lib/constants'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

type Props = {
	onShowGlobalSettings: () => void
}

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

	const translateY = useSharedValue(-200)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : -200, {
			duration: 250,
			easing: visible ? Easing.out(Easing.quad) : Easing.in(Easing.quad),
		})
	}, [visible, translateY, height, insets.top])

	const animatedStyles = useAnimatedStyle(() => {
		return {
			top: insets.top + (Platform.OS === 'android' ? 12 : 0),
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

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const DropdownComponent = Platform.select({
		ios: (
			<NativeDropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<NativeDropdownMenu.Trigger>
					<Button
						className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
						variant="ghost"
						size="icon"
						style={{
							backgroundColor: COLORS.dark.background.overlay.DEFAULT,
							borderColor: COLORS.dark.edge.DEFAULT,
						}}
					>
						{({ pressed }) => (
							<View
								className="squircle items-center justify-center rounded-full"
								style={{
									backgroundColor: COLORS.dark.background.overlay.DEFAULT,
									borderColor: COLORS.dark.edge.DEFAULT,
									height: 35,
									width: 35,
								}}
							>
								<Icon
									as={CircleEllipsis}
									size={24}
									style={{
										opacity: isOpen ? 0.5 : pressed ? 0.85 : 1,
										// @ts-expect-error: This is fine
										color: COLORS.dark.foreground.DEFAULT,
									}}
								/>
							</View>
						)}
					</Button>
				</NativeDropdownMenu.Trigger>

				<NativeDropdownMenu.Content>
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.Sub>
							<NativeDropdownMenu.SubTrigger key="preset">
								<NativeDropdownMenu.ItemTitle>Presets</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon ios={{ name: 'slider.horizontal.below.rectangle' }} />
							</NativeDropdownMenu.SubTrigger>

							<NativeDropdownMenu.SubContent>
								<NativeDropdownMenu.CheckboxItem
									key="standard"
									value={readingMode === ReadingMode.Paged}
									onValueChange={() => setBookPreferences({ readingMode: ReadingMode.Paged })}
								>
									<NativeDropdownMenu.ItemTitle>Paged</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>
								<NativeDropdownMenu.CheckboxItem
									key="vscroll"
									value={readingMode === ReadingMode.ContinuousVertical}
									onValueChange={() =>
										setBookPreferences({ readingMode: ReadingMode.ContinuousVertical })
									}
									disabled
								>
									<NativeDropdownMenu.ItemTitle>Vertical Scroll</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>

								<NativeDropdownMenu.CheckboxItem
									key="hscroll"
									value={readingMode === ReadingMode.ContinuousHorizontal}
									onValueChange={() =>
										setBookPreferences({ readingMode: ReadingMode.ContinuousHorizontal })
									}
								>
									<NativeDropdownMenu.ItemTitle>Horizontal Scroll</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>
							</NativeDropdownMenu.SubContent>
						</NativeDropdownMenu.Sub>

						<NativeDropdownMenu.CheckboxItem
							key="incognito"
							value={!!incognito}
							onValueChange={() => updateGlobalSettings({ incognito: !incognito })}
						>
							<NativeDropdownMenu.ItemIndicator />
							<NativeDropdownMenu.ItemTitle>Incognito</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon
								ios={{ name: incognito ? 'eyeglasses.slash' : 'eyeglasses' }}
							/>
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.Item key="readingDirection" onSelect={onChangeReadingDirection}>
							<NativeDropdownMenu.ItemTitle>Reading Direction</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon
								ios={{
									name:
										readingDirection === ReadingDirection.Ltr
											? 'arrow.right.square'
											: 'arrow.backward.square',
								}}
							/>
						</NativeDropdownMenu.Item>

						<NativeDropdownMenu.Sub>
							<NativeDropdownMenu.SubTrigger key="preset">
								<NativeDropdownMenu.ItemTitle>Reading Timer</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon
									ios={{
										name: 'timer',
									}}
								/>
							</NativeDropdownMenu.SubTrigger>

							<NativeDropdownMenu.SubContent>
								<NativeDropdownMenu.CheckboxItem
									key="enabled"
									value={!!trackElapsedTime}
									onValueChange={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}
								>
									<NativeDropdownMenu.ItemTitle>Enabled</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.CheckboxItem>
								<NativeDropdownMenu.Item
									key="reset"
									destructive
									disabled={!trackElapsedTime || !resetTimer}
									onSelect={resetTimer}
								>
									<NativeDropdownMenu.ItemTitle>Reset Timer</NativeDropdownMenu.ItemTitle>
								</NativeDropdownMenu.Item>
							</NativeDropdownMenu.SubContent>
						</NativeDropdownMenu.Sub>
					</NativeDropdownMenu.Group>

					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.Item key="globalSettings" onSelect={onShowGlobalSettings}>
							<NativeDropdownMenu.ItemTitle>Preferences</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon
								ios={{
									name: 'slider.horizontal.3',
								}}
							/>
						</NativeDropdownMenu.Item>
					</NativeDropdownMenu.Group>
				</NativeDropdownMenu.Content>
			</NativeDropdownMenu.Root>
		),
		android: (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
						variant="ghost"
						size="icon"
						style={{
							backgroundColor: COLORS.dark.background.overlay.DEFAULT,
							borderColor: COLORS.dark.edge.DEFAULT,
						}}
					>
						{({ pressed }) => (
							<View
								className="squircle items-center justify-center rounded-full"
								style={{
									backgroundColor: COLORS.dark.background.overlay.DEFAULT,
									borderColor: COLORS.dark.edge.DEFAULT,
									height: 35,
									width: 35,
								}}
							>
								<Icon
									as={CircleEllipsis}
									size={24}
									style={{
										opacity: isOpen ? 0.5 : pressed ? 0.85 : 1,
										// @ts-expect-error: This is fine
										color: COLORS.dark.foreground.DEFAULT,
									}}
								/>
							</View>
						)}
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					insets={contentInsets}
					sideOffset={2}
					className="w-2/3 tablet:w-64"
					align="end"
				>
					<DropdownMenuGroup>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger className="text-foreground">
								<Text className="text-lg">Presets</Text>
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								<DropdownMenuRadioGroup
									value={readingMode}
									onValueChange={(value) => {
										setBookPreferences({ readingMode: value as ReadingMode })
									}}
								>
									<DropdownMenuRadioItem value="PAGED" className="text-foreground">
										<Text className="text-lg">Paged</Text>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="CONTINUOUS_VERTICAL" className="text-foreground">
										<Text className="text-lg">Vertical Scroll</Text>
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value="CONTINUOUS_HORIZONTAL" className="text-foreground">
										<Text className="text-lg">Horizontal Scroll</Text>
									</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
							</DropdownMenuSubContent>
						</DropdownMenuSub>
					</DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-foreground"
						onPress={() => updateGlobalSettings({ incognito: !incognito })}
					>
						<Text className="text-lg">Incognito</Text>
						<Icon as={Glasses} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem className="text-foreground" onPress={onChangeReadingDirection}>
						<Text className="text-lg">Reading Direction</Text>
						<Icon
							as={readingDirection === ReadingDirection.Ltr ? SquareArrowRight : SquareArrowLeft}
							size={20}
							className="ml-auto text-foreground-muted"
						/>
					</DropdownMenuItem>
					<DropdownMenuSeparator />

					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="text-foreground">
							<Text className="text-lg">Reading Timer</Text>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem
								className="text-foreground"
								onPress={() => setBookPreferences({ trackElapsedTime: !trackElapsedTime })}
								closeOnPress={false}
							>
								<Text className="text-lg">Enabled</Text>
								<View className="ml-auto">
									<Switch
										size="tiny"
										checked={trackElapsedTime}
										onCheckedChange={() =>
											setBookPreferences({ trackElapsedTime: !trackElapsedTime })
										}
									/>
								</View>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-foreground"
								disabled={!trackElapsedTime || !resetTimer}
								onPress={resetTimer}
							>
								<Text className="text-lg">Reset Timer</Text>
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>

					<DropdownMenuSeparator variant="group" />

					<DropdownMenuItem className="text-foreground" onPress={onShowGlobalSettings}>
						<Text className="text-lg">Preferences</Text>
						<Icon as={Settings2} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	return (
		<Animated.View className="absolute z-20 gap-2 px-2" style={animatedStyles}>
			<View className="flex-row items-center justify-between">
				<Button
					className="squircle h-[unset] w-[unset] rounded-full border p-1 tablet:p-2"
					variant="ghost"
					size="icon"
					style={{
						backgroundColor: COLORS.dark.background.overlay.DEFAULT,
						borderColor: COLORS.dark.edge.DEFAULT,
					}}
					onPress={() => router.back()}
				>
					{({ pressed }) => (
						<View
							className="squircle items-center justify-center rounded-full"
							style={{
								backgroundColor: COLORS.dark.background.overlay.DEFAULT,
								borderColor: COLORS.dark.edge.DEFAULT,
								height: 35,
								width: 35,
							}}
						>
							<Icon
								as={X}
								size={24}
								style={{
									opacity: isOpen ? 0.5 : pressed ? 0.85 : 1,
									// @ts-expect-error: This is fine
									color: COLORS.dark.foreground.DEFAULT,
								}}
							/>
						</View>
					)}
				</Button>

				{DropdownComponent}
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
