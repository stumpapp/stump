import { Stack } from 'expo-router'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import { ListFilter } from 'lucide-react-native'
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
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import { useColors } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { FilterGroupDef, MenuGroupDef, MenuItemDef } from './types'

type FilterMenuParams<F> = {
	filters: F
	setFilters: (filters: F) => void
	groups: FilterGroupDef[]
}

// TODO: open questions (that will matter more when you can configure the library type):
// - do we want explicit options for every supported LibraryType? or can we merge a few? i honestly don't know the conceptual boundaries between formats but we have:
//    - Manga -> Manga+??? (Light Novel? Manhwa?)
//    - Books -> Books
//    - Comics -> Comics+?? (Webtoon?)
//    - WebNovel + Webtoon???
//   maybe we support nesting? idk, being a mostly ebook + comics reader, i don't have strong opions are knowledge of prior art for others
// - how do we want to handle Mixed? right now, if i select a narrower type (e.g., Books) it won't show books
//   in a mixed library. i think this is fine
export function useFilterMenu<F extends Record<string, unknown>>({
	filters,
	setFilters,
	groups: groupDefs,
}: FilterMenuParams<F>) {
	const groups = groupDefs.map((def) => {
		const currentValue = get(filters, def.filterPath)
		const unsetPath = def.unsetPath ?? def.filterPath.split('.')[0]!

		const isSingle = def.mode === 'single'
		const currentArray = isSingle ? [] : ((currentValue ?? []) as string[])

		return {
			...def,
			items: def.items.map((opt) => ({
				...opt,
				isOn: isSingle ? currentValue === opt.value : currentArray.includes(opt.value),
				onPress: () => {
					const adjusted = clone(filters)
					if (isSingle) {
						if (currentValue === opt.value) {
							unset(adjusted, unsetPath)
						} else {
							set(adjusted, def.filterPath, opt.value)
						}
					} else {
						const next = currentArray.includes(opt.value)
							? currentArray.filter((v) => v !== opt.value)
							: [...currentArray, opt.value]
						if (next.length) {
							set(adjusted, def.filterPath, next)
						} else {
							unset(adjusted, unsetPath)
						}
					}
					setFilters(adjusted as F)
				},
			})),
		}
	})

	return useEntityFilterMenu({ groups, isFilterApplied: Object.keys(filters).length > 0 })
}

type Params = {
	groups: MenuGroupDef[]
	isFilterApplied?: boolean
}

export function useEntityFilterMenu({ groups, isFilterApplied }: Params) {
	const colors = useColors()
	return Platform.select({
		android: <AndroidFilterMenu groups={groups} />,
		ios: (
			<Stack.Toolbar.Menu
				icon="line.3.horizontal.decrease"
				key="filter-menu"
				tintColor={isFilterApplied ? colors.fill.brand.DEFAULT : undefined}
			>
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
									isOn={item.isOn}
									disabled={item.disabled}
									subtitle={item.subtitle}
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

type AndroidFilterMenuProps = {
	groups: MenuGroupDef[]
	isFilterApplied?: boolean
}

function AndroidFilterMenu({ groups, isFilterApplied }: AndroidFilterMenuProps) {
	const [isOpen, setIsOpen] = useState(false)

	const colors = useColors()
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
				<Text className="text-lg">{item.label}</Text>
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
								style={{
									opacity: pressed ? 0.7 : 1,
									// @ts-expect-error: color should exist its fine
									color: isFilterApplied ? colors.fill.brand.DEFAULT : colors.foreground.DEFAULT,
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
