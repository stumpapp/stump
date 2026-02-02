import { Host, Image } from '@expo/ui/swift-ui'
import { Ellipsis, Grid3x2, List } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useOPDSPreferencesStore } from '~/stores'

export default function FeedActionMenu() {
	const [isOpen, setIsOpen] = useState(false)

	const insets = useSafeAreaInsets()
	const colors = useColors()

	const layout = useOPDSPreferencesStore((state) => state.layout)
	const setLayout = useOPDSPreferencesStore((state) => state.setLayout)

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}
	// TODO: Refactor to make Android align with iOS subtitle design, I am too lazy right now
	const Component = Platform.select({
		ios: (
			<NativeDropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
				<NativeDropdownMenu.Trigger>
					<Pressable>
						<View
							className="squircle items-center justify-center rounded-full"
							style={{
								height: 35,
								width: 35,
							}}
						>
							<View
								accessibilityLabel="options"
								style={{
									height: 35,
									width: 35,
									justifyContent: 'center',
									alignItems: 'center',
								}}
							>
								<Host matchContents>
									<Image systemName="ellipsis" />
								</Host>
							</View>
						</View>
					</Pressable>
				</NativeDropdownMenu.Trigger>

				<NativeDropdownMenu.Content>
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.CheckboxItem
							value={layout === 'grid'}
							key="displayAsGrid"
							onSelect={() => setLayout('grid')}
						>
							<NativeDropdownMenu.ItemTitle>Grid</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'square.grid.3x2' }} />
							<NativeDropdownMenu.ItemSubtitle>Grid</NativeDropdownMenu.ItemSubtitle>,
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={layout === 'list'}
							key="displayAsList"
							onSelect={() => setLayout('list')}
						>
							<NativeDropdownMenu.ItemTitle>List</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'list.bullet' }} />
							<NativeDropdownMenu.ItemSubtitle>List</NativeDropdownMenu.ItemSubtitle>,
						</NativeDropdownMenu.CheckboxItem>
					</NativeDropdownMenu.Group>
				</NativeDropdownMenu.Content>
			</NativeDropdownMenu.Root>
		),
		android: (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="squircle ml-2 mr-2 h-12 w-12 rounded-full border border-edge"
						variant="ghost"
						size="icon"
					>
						{({ pressed }) => (
							<View className="squircle items-center justify-center rounded-full">
								<Icon
									as={Ellipsis}
									size={20}
									style={{
										opacity: isOpen ? 0.5 : pressed ? 0.7 : 1,
										// @ts-expect-error: It's fine
										color: colors.foreground.subtle,
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
					<DropdownMenuCheckboxItem
						checked={layout === 'grid'}
						onCheckedChange={() => setLayout('grid')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Grid</Text>
						<Icon as={Grid3x2} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={layout === 'list'}
						onCheckedChange={() => setLayout('list')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">List</Text>
						<Icon as={List} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	// TODO: Use ActionMenu once expo/ui better supports checkbox items with icons
	return Component
}
