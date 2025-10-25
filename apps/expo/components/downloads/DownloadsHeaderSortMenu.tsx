import { Host, Image } from '@expo/ui/swift-ui'
import {
	ALargeSmall,
	ArrowDownLeft,
	ArrowUpRight,
	CircleEllipsis,
	Clock,
	LibraryBig,
} from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as NativeDropdownMenu from 'zeego/dropdown-menu'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Text,
} from '~/components/ui'
import { COLORS } from '~/lib/constants'

import { Icon } from '../ui/icon'
import { useDownloadsState } from './store'

export default function DownloadsHeaderSortMenu() {
	const [isOpen, setIsOpen] = useState(false)

	const sortConfig = useDownloadsState((state) => state.sort)
	const setSortConfig = useDownloadsState((state) => state.setSort)

	const insets = useSafeAreaInsets()

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
									<Image systemName="line.3.horizontal.decrease" />
								</Host>
							</View>
						</View>
					</Pressable>
				</NativeDropdownMenu.Trigger>

				<NativeDropdownMenu.Content>
					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.option === 'NAME'}
							key="sortByName"
							onSelect={() => {
								setSortConfig({ option: 'NAME', direction: sortConfig.direction })
							}}
						>
							<NativeDropdownMenu.ItemTitle>Name</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'character' }} />
						</NativeDropdownMenu.CheckboxItem>

						{/* Recent */}
						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.option === 'ADDED_AT'}
							key="sortByRecent"
							onSelect={() => {
								setSortConfig({ option: 'ADDED_AT', direction: sortConfig.direction })
							}}
						>
							<NativeDropdownMenu.ItemTitle>Recent</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'clock' }} />
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.option === 'SERIES'}
							key="sortBySeries"
							onSelect={() => {
								setSortConfig({ option: 'SERIES', direction: sortConfig.direction })
							}}
						>
							<NativeDropdownMenu.ItemTitle>Series</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'books.vertical.fill' }} />
						</NativeDropdownMenu.CheckboxItem>
					</NativeDropdownMenu.Group>

					<NativeDropdownMenu.Separator />

					<NativeDropdownMenu.Group>
						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.direction === 'ASC'}
							key="sortAscending"
							onSelect={() => {
								setSortConfig({ option: sortConfig.option, direction: 'ASC' })
							}}
						>
							<NativeDropdownMenu.ItemTitle>Ascending</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'arrow.up.right' }} />
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.direction === 'DESC'}
							key="sortDescending"
							onSelect={() => {
								setSortConfig({ option: sortConfig.option, direction: 'DESC' })
							}}
						>
							<NativeDropdownMenu.ItemTitle>Descending</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'arrow.down.left' }} />
						</NativeDropdownMenu.CheckboxItem>
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
					<DropdownMenuCheckboxItem
						checked={sortConfig.option === 'NAME'}
						onCheckedChange={() => {
							setSortConfig({ option: 'NAME', direction: sortConfig.direction })
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Name</Text>
						<Icon as={ALargeSmall} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.option === 'ADDED_AT'}
						onCheckedChange={() => {
							setSortConfig({ option: 'ADDED_AT', direction: sortConfig.direction })
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Recent</Text>
						<Icon as={Clock} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.option === 'SERIES'}
						onCheckedChange={() => {
							setSortConfig({ option: 'SERIES', direction: sortConfig.direction })
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Series</Text>
						<Icon as={LibraryBig} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuSeparator variant="group" />

					<DropdownMenuCheckboxItem
						checked={sortConfig.direction === 'ASC'}
						onCheckedChange={() => {
							setSortConfig({ option: sortConfig.option, direction: 'ASC' })
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Ascending</Text>
						<Icon as={ArrowUpRight} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.direction === 'DESC'}
						onCheckedChange={() => {
							setSortConfig({ option: sortConfig.option, direction: 'DESC' })
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">Descending</Text>
						<Icon as={ArrowDownLeft} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	// TODO: Use ActionMenu once expo/ui better supports checkbox items with icons
	return Component
}
