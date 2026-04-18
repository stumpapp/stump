import { MediaMetadataModelOrdering, MediaModelOrdering, MediaOrderBy } from '@stump/graphql'
import { Stack } from 'expo-router'
import clone from 'lodash/cloneDeep'
import set from 'lodash/set'
import { Ellipsis, Grid2X2, List } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { useBookFilterStore } from '~/stores/filters'

// todo: there is enough basically duplicate logic between this and series that if i need
// _any_ more then i should abstract

export function useBooksSortAndDisplayMenu() {
	const { t } = useTranslate()

	// todo: prolly make a separate hook for the setter callbacks to share between menus
	const sort = useBookFilterStore((store) => store.sort)
	const setSort = useBookFilterStore((store) => store.setSort)

	const sortConfig = match(sort)
		.with({ media: P.not(P.nullish) }, ({ media: { field, direction } }) => ({
			field,
			direction,
		}))
		.with({ metadata: P.not(P.nullish) }, ({ metadata: { field, direction } }) => ({
			field,
			direction,
		}))
		.otherwise(() => ({ field: 'NAME', direction: 'ASC' }))

	const onSortFieldPress = (field: string, isMetadata: boolean) => {
		const adjustedConfig = clone(sortConfig)

		if (field === sortConfig.field) {
			set(adjustedConfig, 'direction', sortConfig.direction === 'ASC' ? 'DESC' : 'ASC')
		} else {
			set(adjustedConfig, 'field', field)
			set(adjustedConfig, 'direction', 'ASC')
		}

		const adjustedSort = isMetadata
			? ({
					metadata: {
						field: adjustedConfig.field as MediaMetadataModelOrdering,
						direction: adjustedConfig.direction,
					},
				} as MediaOrderBy)
			: ({
					media: {
						field: adjustedConfig.field as MediaModelOrdering,
						direction: adjustedConfig.direction,
					},
				} as MediaOrderBy)

		setSort(adjustedSort)
	}

	const getSubtitle = (field: string) => {
		if (field !== sortConfig.field) return undefined
		if (['DATE_ADDED', 'YEAR', 'CREATED_AT'].includes(field)) {
			return t(`sorting.sortDirectionDate.${sortConfig.direction}`)
		}
		// for now only strings are left
		return t(`sorting.sortDirectionString.${sortConfig.direction}`)
	}

	// todo: support list
	return Platform.select({
		android: (
			<AndroidMenu
				sortConfig={sortConfig}
				onSortFieldPress={onSortFieldPress}
				getSubtitle={getSubtitle}
			/>
		),
		ios: (
			<Stack.Toolbar.Menu icon="ellipsis">
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction icon="rectangle.grid.2x2" disabled isOn>
						{t('common.grid')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction icon="list.bullet" disabled>
						{t('common.list')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.Menu inline title={t('sorting.labelEllipsis')}>
					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'NAME'}
						subtitle={getSubtitle('NAME')}
						onPress={() => onSortFieldPress('NAME', false)}
					>
						{t('sorting.sortField.NAME')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'CREATED_AT'}
						subtitle={getSubtitle('CREATED_AT')}
						onPress={() => onSortFieldPress('CREATED_AT', false)}
					>
						{t('sorting.sortField.CREATED_AT')}
					</Stack.Toolbar.MenuAction>

					<Stack.Toolbar.MenuAction
						isOn={sortConfig.field === 'YEAR'}
						subtitle={getSubtitle('YEAR')}
						onPress={() => onSortFieldPress('YEAR', true)}
					>
						{t('sorting.sortField.YEAR')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		),
	})
}

type AndroidProps = {
	sortConfig: {
		field: string
		direction: string
	}
	onSortFieldPress: (field: string, isMetadata: boolean) => void
	getSubtitle: (field: string) => string | undefined
}

function AndroidMenu({ sortConfig, onSortFieldPress, getSubtitle }: AndroidProps) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)
	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderSubtitle = (field: string) => {
		const subtitle = getSubtitle(field)
		if (!subtitle) return null

		return <Text className="text-sm text-foreground-muted">{subtitle}</Text>
	}

	return (
		<DropdownMenu onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button className="squircle mr-2" variant="ghost" size="icon">
					{({ pressed }) => (
						// TODO(colors): should formalize this pattern into the dropdown trigger by some means instead of copy/pasting
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
				<DropdownMenuCheckboxItem checked onCheckedChange={() => {}} className="text-foreground">
					<View className="gap-4 flex flex-row items-center">
						<Icon as={Grid2X2} size={20} className="text-foreground-muted" />
						<Text className="text-lg">{t('common.grid')}</Text>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuCheckboxItem
					checked={false}
					onCheckedChange={() => {}}
					className="text-foreground"
					disabled
				>
					<View className="gap-4 flex flex-row items-center">
						<Icon as={List} size={20} className="text-foreground-muted" />
						<Text className="text-lg">{t('common.list')}</Text>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-foreground-muted">
						{t('sorting.labelEllipsis')}
					</DropdownMenuLabel>

					<DropdownMenuCheckboxItem
						checked={sortConfig.field === 'NAME'}
						onCheckedChange={() => onSortFieldPress('NAME', false)}
						className="text-foreground"
					>
						<View className="gap-4 flex w-full flex-row items-center justify-between">
							<Text className="text-lg">{t('sorting.sortField.NAME')}</Text>
							{renderSubtitle('NAME')}
						</View>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.field === 'CREATED_AT'}
						onCheckedChange={() => onSortFieldPress('CREATED_AT', false)}
						className="text-foreground"
					>
						<View className="gap-4 flex w-full flex-row items-center justify-between">
							<Text className="text-lg">{t('sorting.sortField.CREATED_AT')}</Text>
							{renderSubtitle('CREATED_AT')}
						</View>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.field === 'YEAR'}
						onCheckedChange={() => onSortFieldPress('YEAR', false)}
						className="text-foreground"
					>
						<View className="gap-4 flex w-full flex-row items-center justify-between">
							<Text className="text-lg">{t('sorting.sortField.YEAR')}</Text>
							{renderSubtitle('YEAR')}
						</View>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
