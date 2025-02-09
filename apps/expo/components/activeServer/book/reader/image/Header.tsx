import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { icons, Text } from '~/components/ui'
import { useReaderStore } from '~/stores'
import { useBookPreferences } from '~/stores/reader'

import { useImageBasedReader } from './context'

const { X, CircleEllipsis } = icons

export default function Header() {
	const {
		book: { name, id },
	} = useImageBasedReader()
	const {
		preferences: { readingDirection, readingMode },
		setBookPreferences,
		updateGlobalSettings,
	} = useBookPreferences(id)

	const incognito = useReaderStore((state) => state.globalSettings.incognito)
	const insets = useSafeAreaInsets()
	const truncatedName = useMemo(() => (name.length > 25 ? `${name.slice(0, 25)}...` : name), [name])
	const visible = useReaderStore((state) => state.showControls)

	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)

	// TODO: animate
	if (!visible) {
		return null
	}

	return (
		<View
			className="absolute z-10 flex-row items-center justify-between px-2"
			style={{
				top: insets.top,
				left: insets.left,
				right: insets.right,
			}}
		>
			<Pressable onPress={() => router.back()}>
				{({ pressed }) => <X className="text-foreground" style={{ opacity: pressed ? 0.85 : 1 }} />}
			</Pressable>

			<Text className="font-semibold">{truncatedName}</Text>

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
						<DropdownMenu.Item key="globalSettings">
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
		</View>
	)
}
