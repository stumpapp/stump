import { Host, Image } from '@expo/ui/swift-ui'
import { Ellipsis, Grid3x2, List, ListMinus, ListPlus } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useColors } from '~/lib/constants'
import { usePreferencesStore } from '~/stores'

type Props = {
	onCollapseAll?: () => void
	onExpandAll?: () => void
}

export default function SmartListActionMenu({ onCollapseAll, onExpandAll }: Props) {
	const [isOpen, setIsOpen] = useState(false)

	const insets = useSafeAreaInsets()
	const colors = useColors()

	const setPreferences = usePreferencesStore((state) => state.patch)
	const layout = usePreferencesStore((state) => state.smartListLayout)

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

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
							onSelect={() => setPreferences({ smartListLayout: 'grid' })}
						>
							<NativeDropdownMenu.ItemTitle>Grid</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'square.grid.3x2' }} />
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={layout === 'list'}
							key="displayAsList"
							onSelect={() => setPreferences({ smartListLayout: 'list' })}
						>
							<NativeDropdownMenu.ItemTitle>List</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'list.bullet' }} />
						</NativeDropdownMenu.CheckboxItem>
					</NativeDropdownMenu.Group>

					{onCollapseAll && onExpandAll && (
						<NativeDropdownMenu.Group>
							<NativeDropdownMenu.Item key="collapseAll" onSelect={onCollapseAll}>
								<NativeDropdownMenu.ItemTitle>Collapse All</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon ios={{ name: 'rectangle.stack.badge.minus' }} />
							</NativeDropdownMenu.Item>

							<NativeDropdownMenu.Item key="expandAll" onSelect={onExpandAll}>
								<NativeDropdownMenu.ItemTitle>Expand All</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon ios={{ name: 'rectangle.stack.badge.plus' }} />
							</NativeDropdownMenu.Item>
						</NativeDropdownMenu.Group>
					)}
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
						onCheckedChange={() => setPreferences({ smartListLayout: 'grid' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Grid</Text>
						<Icon as={Grid3x2} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={layout === 'list'}
						onCheckedChange={() => setPreferences({ smartListLayout: 'list' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">List</Text>
						<Icon as={List} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					{onCollapseAll && onExpandAll && (
						<>
							<DropdownMenuSeparator />

							<DropdownMenuGroup>
								<DropdownMenuItem onPress={onCollapseAll}>
									<Icon as={ListMinus} size={16} className="mr-2 text-foreground" />
									<Text className="text-lg">Collapse All</Text>
								</DropdownMenuItem>

								<DropdownMenuItem onPress={onExpandAll}>
									<Icon as={ListPlus} size={16} className="mr-2 text-foreground" />
									<Text className="text-lg">Expand All</Text>
								</DropdownMenuItem>
							</DropdownMenuGroup>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	return Component
}
