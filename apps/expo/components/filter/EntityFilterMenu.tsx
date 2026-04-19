import { Stack } from 'expo-router'
import { ListFilter } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { MenuGroupDef, MenuItemDef } from './types'

type Params = {
	groups: MenuGroupDef[]
}

export function useEntityFilterMenu({ groups }: Params) {
	const { t } = useTranslate()

	return Platform.select({
		android: <AndroidFilterMenu groups={groups} />,
		ios: (
			<Stack.Toolbar.Menu icon="line.3.horizontal.decrease" key="filter-menu">
				{groups.map((group) => (
					<Stack.Toolbar.Menu key={group.key} inline={group.inline} title={group.title}>
						{group.items.map((item) => (
							<Stack.Toolbar.MenuAction
								key={item.key}
								icon={item.icon?.ios}
								isOn={item.isOn}
								disabled={item.disabled}
								subtitle={item.subtitle}
								onPress={item.onPress}
							>
								{t(item.labelKey)}
							</Stack.Toolbar.MenuAction>
						))}
					</Stack.Toolbar.Menu>
				))}
			</Stack.Toolbar.Menu>
		),
	})
}

type AndroidFilterMenuProps = {
	groups: MenuGroupDef[]
}

function AndroidFilterMenu({ groups }: AndroidFilterMenuProps) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)
	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderItem = (item: MenuItemDef) => (
		<DropdownMenuCheckboxItem
			key={item.key}
			checked={item.isOn}
			onCheckedChange={item.onPress}
			className="text-foreground"
			disabled={item.disabled}
		>
			<View className="gap-4 flex flex-row items-center">
				{item.icon?.android && (
					<Icon as={item.icon.android} size={20} className="text-foreground-muted" />
				)}
				<Text className="text-lg">{t(item.labelKey)}</Text>
			</View>
		</DropdownMenuCheckboxItem>
	)

	return (
		<DropdownMenu onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button className="squircle mr-2" variant="ghost" size="icon">
					{({ pressed }) => (
						<View
							className={cn(
								'squircle p-2 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors duration-200',
								{
									'bg-black/10 dark:bg-white/5 border-edge': isOpen,
								},
							)}
						>
							<Icon
								as={ListFilter}
								size={20}
								className="text-foreground"
								style={{
									opacity: pressed ? 0.7 : 1,
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
				{groups.map((group, groupIndex) => (
					<View key={group.key}>
						{groupIndex > 0 && <DropdownMenuSeparator />}

						{group.label ? (
							<DropdownMenuGroup>
								<DropdownMenuLabel className="text-foreground-muted">
									{group.label}
								</DropdownMenuLabel>
								{group.items.map(renderItem)}
							</DropdownMenuGroup>
						) : (
							group.items.map(renderItem)
						)}
					</View>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
