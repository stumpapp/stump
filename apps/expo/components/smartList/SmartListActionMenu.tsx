import { Button as SwiftButton, Divider, Host, Image, Label, Menu, Picker } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { Ellipsis, Grid3x2, List, ListMinus, ListPlus } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
					<Menu label={<Image systemName="ellipsis" />}>
						<Picker
							selection={layout}
							onSelectionChange={(selection) => setPreferences({ smartListLayout: selection })}
							modifiers={[pickerStyle('inline')]}
						>
							<Label title="Grid" systemImage="square.grid.3x2" modifiers={[tag('grid')]} />
							<Label title="List" systemImage="list.bullet" modifiers={[tag('list')]} />
						</Picker>

						{onCollapseAll && onExpandAll && (
							<>
								<Divider />
								<SwiftButton
									label="Collapse All"
									systemImage="rectangle.stack.badge.minus"
									onPress={onCollapseAll}
								/>
								<SwiftButton
									label="Expand All"
									systemImage="rectangle.stack.badge.plus"
									onPress={onExpandAll}
								/>
							</>
						)}
					</Menu>
				</Host>
			</View>
		),
		android: (
			<DropdownMenu onOpenChange={setIsOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						className="squircle ml-2 mr-2 h-12 w-12 border-edge rounded-full border"
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
					className="tablet:w-64 w-2/3"
					align="end"
				>
					<DropdownMenuCheckboxItem
						checked={layout === 'grid'}
						onCheckedChange={() => setPreferences({ smartListLayout: 'grid' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Grid</Text>
						<Icon as={Grid3x2} size={20} className="text-foreground-muted ml-auto" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={layout === 'list'}
						onCheckedChange={() => setPreferences({ smartListLayout: 'list' })}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">List</Text>
						<Icon as={List} size={20} className="text-foreground-muted ml-auto" />
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
