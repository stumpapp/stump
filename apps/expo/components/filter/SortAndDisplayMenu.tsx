import { InterfaceLayout } from '@stump/graphql'
import { Stack } from 'expo-router'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import { Ellipsis, Grid2X2, List } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { SFSymbol } from 'sf-symbols-typescript'
import { match, P } from 'ts-pattern'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import { ActionDef, MenuGroupDef, MenuItemDef, SortFieldDef } from './types'

type Props<O> = {
	sort: O
	setSort: (sort: O) => void
	layout: InterfaceLayout
	setLayout: (layout: InterfaceLayout) => void
	fields: SortFieldDef[]
	actions?: ActionDef[]
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

export function useSortAndDisplayMenu<O extends Record<string, unknown>>({
	sort,
	setSort,
	layout,
	setLayout,
	fields,
	actions,
}: Props<O>) {
	const { t } = useTranslate()

	const sortConfig = extractSortConfig(sort, fields)

	const onSortFieldPress = (fieldDef: SortFieldDef) => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { orderKey: _, ...adjustedConfig } = clone(sortConfig)

		if (fieldDef.field === sortConfig.field) {
			set(adjustedConfig, 'direction', sortConfig.direction === 'ASC' ? 'DESC' : 'ASC')
		} else {
			const isDateField = DATE_FIELDS.includes(fieldDef.field)
			set(adjustedConfig, 'field', fieldDef.field)
			set(adjustedConfig, 'direction', isDateField ? 'DESC' : 'ASC')
		}

		const adjustedSort = set({}, fieldDef.orderKey, adjustedConfig) as O

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
		label: t(`sorting.sortField.${fieldDef.field}`),
		isOn: sortConfig.field === fieldDef.field,
		subtitle: getSubtitle(fieldDef.field),
		onPress: () => onSortFieldPress(fieldDef),
	}))

	const normalActions = actions?.filter((a) => !a.destructive) ?? []
	const destructiveActions = actions?.filter((a) => a.destructive) ?? []

	const groups: MenuGroupDef[] = [
		{
			key: 'display-mode',
			inline: true,
			items: [
				{
					key: 'grid',
					icon: { ios: 'rectangle.grid.2x2', android: Grid2X2 },
					label: t('common.grid'),
					isOn: layout === InterfaceLayout.Grid,
					onPress: () => setLayout(InterfaceLayout.Grid),
				},
				{
					key: 'list',
					icon: { ios: 'list.bullet', android: List },
					label: t('common.list'),
					isOn: layout === InterfaceLayout.Table,
					onPress: () => setLayout(InterfaceLayout.Table),
				},
			],
		},
	]

	if (normalActions.length > 0) {
		groups.push({
			key: 'actions',
			inline: true,
			items: normalActions.map((a) => ({
				key: a.key,
				icon: a.icon,
				label: a.label,
				isOn: false,
				isAction: true,
				onPress: a.onPress,
			})),
		})
	}

	groups.push({
		key: 'sort-fields',
		title: t('sorting.labelEllipsis'),
		label: t('sorting.labelEllipsis'),
		inline: true,
		items: sortItems,
	})

	if (destructiveActions.length > 0) {
		groups.push({
			key: 'destructive-actions',
			inline: true,
			items: destructiveActions.map((a) => ({
				key: a.key,
				icon: a.icon,
				label: a.label,
				isOn: false,
				isAction: true,
				destructive: true,
				onPress: a.onPress,
			})),
		})
	}

	return Platform.select({
		android: <AndroidSortMenu groups={groups} />,
		ios: (
			<Stack.Toolbar.Menu icon="ellipsis">
				{groups.map((group) => (
					<Stack.Toolbar.Menu key={group.key} inline={group.inline} title={group.title}>
						{group.items.map((item) => {
							const iconProps = match(item.icon?.ios)
								.with({ xcasset: P.string }, (icon) => ({ xcasset: icon.xcasset }))
								.with(P.string, (icon) => ({ sf: icon }))
								.with(P.nullish, () => null)
								.with(P.select(), (src) => ({ src }))
								.otherwise(
									() =>
										({
											sf: 'circle' satisfies SFSymbol,
										}) as const,
								)

							return (
								<Stack.Toolbar.MenuAction
									key={item.key}
									isOn={item.isAction ? undefined : item.isOn}
									disabled={item.disabled}
									subtitle={item.subtitle}
									destructive={item.destructive}
									onPress={item.onPress}
								>
									{iconProps && <Stack.Toolbar.Icon {...iconProps} />}
									{item.label}
								</Stack.Toolbar.MenuAction>
							)
						})}
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

	const renderActionItem = (item: MenuItemDef) => (
		<DropdownMenuItem
			key={item.key}
			onPress={item.onPress}
			className="flex-row items-center"
			variant={item.destructive ? 'destructive' : 'default'}
		>
			<View className="gap-4 flex w-full flex-row items-center">
				{item.icon?.android && (
					<Icon
						as={item.icon.android}
						size={20}
						className={cn('text-foreground-muted', {
							'text-fill-danger': item.destructive,
						})}
					/>
				)}
				<Text
					className={cn('text-lg', {
						'text-fill-danger': item.destructive,
					})}
				>
					{item.label}
				</Text>
			</View>
		</DropdownMenuItem>
	)

	const renderCheckboxItem = (item: MenuItemDef) => (
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
						<Text className="text-lg">{item.label}</Text>
					</View>
				) : (
					<Text className="text-lg">{item.label}</Text>
				)}
				{renderSubtitle(item)}
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
								{group.items.map((item) =>
									item.isAction ? renderActionItem(item) : renderCheckboxItem(item),
								)}
							</DropdownMenuGroup>
						) : (
							group.items.map((item) =>
								item.isAction ? renderActionItem(item) : renderCheckboxItem(item),
							)
						)}
					</View>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
