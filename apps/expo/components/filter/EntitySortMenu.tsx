import { Stack } from 'expo-router'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import { Ellipsis, Grid2X2, List } from 'lucide-react-native'
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

import { MenuGroupDef, MenuItemDef, SortFieldDef } from './types'

type Props<O> = {
	sort: O
	setSort: (sort: O) => void
	fields: SortFieldDef[]
}

// silly ts compiler
const isFieldAndDirection = (
	obj: Record<string, unknown>,
): obj is { field: string; direction: string } => {
	return (
		'field' in obj &&
		'direction' in obj &&
		typeof obj.field === 'string' &&
		typeof obj.direction === 'string'
	)
}

function extractSortConfig<O extends Record<string, unknown>>(
	sort: O,
	fields: SortFieldDef[],
): SortFieldDef & { direction: string } {
	const orderKeys = [...new Set(fields.map((f) => f.orderKey))]
	for (const key of orderKeys) {
		const value = get(sort, key)
		if (value && isFieldAndDirection(value)) {
			return { field: value.field, direction: value.direction, orderKey: key }
		}
	}

	return { field: 'NAME', direction: 'ASC', orderKey: orderKeys[0]! } // bang
}

const DATE_FIELDS = ['DATE_ADDED', 'YEAR', 'CREATED_AT']

export function useEntitySortMenu<O extends Record<string, unknown>>({
	sort,
	setSort,
	fields,
}: Props<O>) {
	const { t } = useTranslate()

	const sortConfig = extractSortConfig(sort, fields)

	const onSortFieldPress = (fieldDef: SortFieldDef) => {
		const adjustedConfig = clone(sortConfig)

		if (fieldDef.field === sortConfig.field) {
			set(adjustedConfig, 'direction', sortConfig.direction === 'ASC' ? 'DESC' : 'ASC')
		} else {
			const isDateField = DATE_FIELDS.includes(fieldDef.field)
			set(adjustedConfig, 'field', fieldDef.field)
			set(adjustedConfig, 'direction', isDateField ? 'DESC' : 'ASC')
		}

		const adjustedSort = {
			[fieldDef.orderKey]: adjustedConfig,
		} as O

		setSort(adjustedSort)
	}

	const getSubtitle = (field: string) => {
		if (field !== sortConfig.field) return undefined
		if (DATE_FIELDS.includes(field)) {
			return t(`sorting.sortDirectionDate.${sortConfig.direction}`)
		}
		return t(`sorting.sortDirectionString.${sortConfig.direction}`)
	}

	const sortItems: MenuItemDef[] = fields.map((fieldDef) => ({
		key: fieldDef.field,
		labelKey: `sorting.sortField.${fieldDef.field}`,
		isOn: sortConfig.field === fieldDef.field,
		subtitle: getSubtitle(fieldDef.field),
		onPress: () => onSortFieldPress(fieldDef),
	}))

	const groups: MenuGroupDef[] = [
		{
			key: 'display-mode',
			inline: true,
			items: [
				{
					key: 'grid',
					icon: { ios: 'rectangle.grid.2x2', android: Grid2X2 },
					labelKey: 'common.grid',
					isOn: true,
					disabled: true,
					onPress: () => {},
				},
				{
					key: 'list',
					icon: { ios: 'list.bullet', android: List },
					labelKey: 'common.list',
					isOn: false,
					disabled: true,
					onPress: () => {},
				},
			],
		},
		{
			key: 'sort-fields',
			title: t('sorting.labelEllipsis'),
			label: t('sorting.labelEllipsis'),
			inline: true,
			items: sortItems,
		},
	]

	return Platform.select({
		android: <AndroidSortMenu groups={groups} />,
		ios: (
			<Stack.Toolbar.Menu icon="ellipsis">
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

type AndroidSortMenuProps = {
	groups: MenuGroupDef[]
}

function AndroidSortMenu({ groups }: AndroidSortMenuProps) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)
	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderSubtitle = (item: MenuItemDef) => {
		if (!item.subtitle) return null
		return <Text className="text-sm text-foreground-muted">{item.subtitle}</Text>
	}

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
								as={Ellipsis}
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
								{group.items.map((item) => (
									<DropdownMenuCheckboxItem
										key={item.key}
										checked={item.isOn}
										onCheckedChange={item.onPress}
										className="text-foreground"
										disabled={item.disabled}
									>
										<View className="gap-4 flex w-full flex-row items-center justify-between">
											{item.icon?.android ? (
												<View className="gap-4 flex flex-row items-center">
													<Icon
														as={item.icon.android}
														size={20}
														className="text-foreground-muted"
													/>
													<Text className="text-lg">{t(item.labelKey)}</Text>
												</View>
											) : (
												<Text className="text-lg">{t(item.labelKey)}</Text>
											)}
											{renderSubtitle(item)}
										</View>
									</DropdownMenuCheckboxItem>
								))}
							</DropdownMenuGroup>
						) : (
							group.items.map((item) => (
								<DropdownMenuCheckboxItem
									key={item.key}
									checked={item.isOn}
									onCheckedChange={item.onPress}
									className="text-foreground"
									disabled={item.disabled}
								>
									<View className="gap-4 flex w-full flex-row items-center justify-between">
										{item.icon?.android ? (
											<View className="gap-4 flex flex-row items-center">
												<Icon as={item.icon.android} size={20} className="text-foreground-muted" />
												<Text className="text-lg">{t(item.labelKey)}</Text>
											</View>
										) : (
											<Text className="text-lg">{t(item.labelKey)}</Text>
										)}
										{renderSubtitle(item)}
									</View>
								</DropdownMenuCheckboxItem>
							))
						)}
					</View>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
