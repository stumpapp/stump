import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { useDisplay } from '~/lib/hooks'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

const { X, CircleEllipsis } = icons

export default function Header() {
	const { height } = useDisplay()
	const {
		book: { name, id },
	} = useImageBasedReader()
	const {
		preferences: { readingDirection, readingMode },
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences(id)

	const [showGlobalSettings, setShowGlobalSettings] = useState(false)

	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const visible = useReaderStore((state) => state.showControls)

	const translateY = useSharedValue(0)
	useEffect(() => {
		translateY.value = withTiming(visible ? 0 : 100 * -1, {
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

	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)

	return (
		<Animated.View
			className="absolute z-20 flex-row items-center justify-between px-2"
			style={animatedStyles}
		>
			<Pressable onPress={() => router.back()}>
				{({ pressed }) => <X className="text-foreground" style={{ opacity: pressed ? 0.85 : 1 }} />}
			</Pressable>

			<Text className="max-w-[80%] font-semibold" numberOfLines={1} ellipsizeMode="tail">
				{name}
			</Text>

			<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<DropdownMenu.Trigger>
					<Pressable onPress={() => setIsOpen((prev) => !prev)}>
						{({ pressed }) => (
							<CircleEllipsis
								className="text-foreground"
								style={{ opacity: isOpen ? 0.5 : pressed ? 0.85 : 1 }}
							/>
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
									onValueChange={() => setBookPreferences({ readingMode: 'continuous:horizontal' })}
								>
									<DropdownMenu.ItemTitle>Horizontal Scroll</DropdownMenu.ItemTitle>
								</DropdownMenu.CheckboxItem>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>

						<DropdownMenu.Item key="bookPreferences">
							<DropdownMenu.ItemTitle>Book Preferences</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIcon
								ios={{
									name: 'slider.horizontal.2.square.on.square',
								}}
							/>
						</DropdownMenu.Item>

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

						<DropdownMenu.Item
							key="readingDirection"
							onSelect={() =>
								setBookPreferences({
									readingDirection: readingDirection === 'ltr' ? 'rtl' : 'ltr',
								})
							}
						>
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
					</DropdownMenu.Group>

					<DropdownMenu.Group>
						<DropdownMenu.Item key="globalSettings" onSelect={() => setShowGlobalSettings(true)}>
							<DropdownMenu.ItemTitle>Settings</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIcon
								ios={{
									name: 'gearshape',
								}}
							/>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Animated.View>
	)
}
