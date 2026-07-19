import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { Stack } from 'expo-router'
import {
	ALargeSmall,
	AlertCircle,
	CheckCircle,
	Clock,
	Ellipsis,
	LibraryBig,
	RefreshCw,
	Sparkles,
	Trash,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Alert, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Icon,
	Text,
} from '~/components/ui'
import {
	useDownload,
	useDownloadsCount,
	useFailedDownloadsCount,
	useFullSync,
	useTranslate,
} from '~/lib/hooks'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'
import { useSelectionStore } from '~/stores/selection'

import { DOWNLOAD_PROBLEMS_SHEET_NAME } from '../downloadQueue'
import { DownloadSortOption, useDownloadsState } from './store'

export function useLocalLibrarySortAndDisplayMenu() {
	const { t } = useTranslate()

	const sortConfig = useDownloadsState((state) => state.sort)
	const setSortConfig = useDownloadsState((state) => state.setSort)

	const isCuratedDownloadsEnabled = usePreferencesStore(
		(state) => state.showCuratedDownloads ?? false,
	)
	const patch = usePreferencesStore((state) => state.patch)
	const setIsCuratedDownloadsEnabled = (value: boolean) => patch({ showCuratedDownloads: value })

	const { deleteAllDownloads } = useDownload()
	const refetchDownloads = useDownloadsState((state) => state.increment)
	const setIsSelecting = useSelectionStore((state) => state.setIsSelecting)
	const { syncAll } = useFullSync()

	const downloadsCount = useDownloadsCount()
	const failedDownloadsCount = useFailedDownloadsCount()

	const handleSortSelection = useCallback(
		(option: DownloadSortOption) => {
			if (sortConfig.option === option) {
				setSortConfig({ option, direction: sortConfig.direction === 'ASC' ? 'DESC' : 'ASC' })
			} else {
				const defaultDirection = option === 'ADDED_AT' ? 'DESC' : 'ASC'
				setSortConfig({ option, direction: defaultDirection })
			}
		},
		[setSortConfig, sortConfig],
	)

	const getSortSubtitle = useCallback(
		(option: DownloadSortOption) => {
			if (sortConfig.option !== option) return undefined
			const localeKey = option === 'ADDED_AT' ? 'sortDirectionDate' : 'sortDirectionText'
			return t(getSortKey(`${localeKey}.${sortConfig.direction}`))
		},
		[sortConfig, t],
	)

	const onDeleteAllDownloads = async () => {
		await deleteAllDownloads()
		refetchDownloads()
	}

	const confirmDeleteAllDownloads = () => {
		Alert.alert(
			t(getActionsKey('deleteAllDownloads.confirmation')),
			t(getActionsKey('deleteAllDownloads.disclaimer')),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{ text: t('common.delete'), style: 'destructive', onPress: onDeleteAllDownloads },
			],
		)
	}

	return Platform.select({
		ios: (
			<Stack.Toolbar.Menu icon="ellipsis" key="sort-actions-menu">
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction
						icon="character"
						isOn={sortConfig.option === 'NAME'}
						subtitle={getSortSubtitle('NAME')}
						onPress={() => handleSortSelection('NAME')}
					>
						{t(getSortKey('sortBy.NAME'))}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						icon="clock"
						isOn={sortConfig.option === 'ADDED_AT'}
						subtitle={getSortSubtitle('ADDED_AT')}
						onPress={() => handleSortSelection('ADDED_AT')}
					>
						{t(getSortKey('sortBy.ADDED_AT'))}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						icon="books.vertical.fill"
						isOn={sortConfig.option === 'SERIES'}
						subtitle={getSortSubtitle('SERIES')}
						onPress={() => handleSortSelection('SERIES')}
					>
						{t(getSortKey('sortBy.SERIES'))}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction
						icon="checkmark.circle"
						onPress={() => setIsSelecting(true)}
						disabled={downloadsCount === 0}
					>
						{t('common.select')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						icon="arrow.trianglehead.2.clockwise.rotate.90"
						onPress={async () => {
							await syncAll()
							refetchDownloads()
						}}
					>
						{t(getActionsKey('attemptSync'))}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						icon="sparkles.rectangle.stack"
						onPress={() => setIsCuratedDownloadsEnabled(!isCuratedDownloadsEnabled)}
					>
						{t(getActionsKey(isCuratedDownloadsEnabled ? 'hideCurated' : 'showCurated'))}
					</Stack.Toolbar.MenuAction>
					{failedDownloadsCount > 0 && (
						<Stack.Toolbar.MenuAction
							icon="exclamationmark.triangle"
							onPress={() => TrueSheet.present(DOWNLOAD_PROBLEMS_SHEET_NAME)}
						>
							{t(getActionsKey('seeProblems'), {
								problemsCount: failedDownloadsCount.toString(),
							})}
						</Stack.Toolbar.MenuAction>
					)}
				</Stack.Toolbar.Menu>
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction
						icon="trash"
						onPress={confirmDeleteAllDownloads}
						destructive
						disabled={downloadsCount === 0}
					>
						{t(getActionsKey('deleteAllDownloads.label'))}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		),
		android: (
			<AndroidSortAndActionsMenu
				sortConfig={sortConfig}
				downloadsCount={downloadsCount}
				failedDownloadsCount={failedDownloadsCount}
				isCuratedDownloadsEnabled={isCuratedDownloadsEnabled}
				onSortSelection={handleSortSelection}
				onSelect={() => setIsSelecting(true)}
				onSync={async () => {
					await syncAll()
					refetchDownloads()
				}}
				onToggleCurated={() => setIsCuratedDownloadsEnabled(!isCuratedDownloadsEnabled)}
				onSeeProblems={() => TrueSheet.present(DOWNLOAD_PROBLEMS_SHEET_NAME)}
				onDeleteAll={confirmDeleteAllDownloads}
			/>
		),
	})
}

// this is a bit of an enormous props but i am too lazy to do anything else rn
type AndroidMenuProps = {
	sortConfig: { option: DownloadSortOption; direction: 'ASC' | 'DESC' }
	downloadsCount: number
	failedDownloadsCount: number
	isCuratedDownloadsEnabled: boolean
	onSortSelection: (option: DownloadSortOption) => void
	onSelect: () => void
	onSync: () => Promise<void>
	onToggleCurated: () => void
	onSeeProblems: () => void
	onDeleteAll: () => void
}

function AndroidSortAndActionsMenu({
	sortConfig,
	downloadsCount,
	failedDownloadsCount,
	isCuratedDownloadsEnabled,
	onSortSelection,
	onSelect,
	onSync,
	onToggleCurated,
	onSeeProblems,
	onDeleteAll,
}: AndroidMenuProps) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)

	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderAndroidSortLabel = (option: DownloadSortOption, direction: 'ASC' | 'DESC') => {
		if (option !== sortConfig.option) return null

		const localeKey = option === 'ADDED_AT' ? 'sortDirectionDate' : 'sortDirectionText'
		return t(getSortKey(`${localeKey}.${direction}`))
	}

	const renderSortText = (label: string, subtitle: string | null) => (
		<View className={cn('flex-1', !subtitle && 'justify-center')}>
			<Text className="text-lg">{label}</Text>
			{subtitle && <Text className="text-sm text-foreground-muted">{subtitle}</Text>}
		</View>
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
								style={{ opacity: pressed ? 0.7 : 1 }}
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
					checked={sortConfig.option === 'NAME'}
					onCheckedChange={() => onSortSelection('NAME')}
					className="text-foreground"
				>
					<View className="flex w-full">
						<View className="gap-4 flex flex-1 flex-row items-center">
							<Icon as={ALargeSmall} size={20} className="text-foreground-muted ml-auto" />
							{renderSortText(
								t(getSortKey('sortBy.NAME')),
								renderAndroidSortLabel('NAME', sortConfig.direction),
							)}
						</View>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuCheckboxItem
					checked={sortConfig.option === 'ADDED_AT'}
					onCheckedChange={() => onSortSelection('ADDED_AT')}
					className="text-foreground"
				>
					<View className="flex w-full">
						<View className="gap-4 flex flex-1 flex-row items-center">
							<Icon as={Clock} size={20} className="text-foreground-muted ml-auto" />
							{renderSortText(
								t(getSortKey('sortBy.ADDED_AT')),
								renderAndroidSortLabel('ADDED_AT', sortConfig.direction),
							)}
						</View>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuCheckboxItem
					checked={sortConfig.option === 'SERIES'}
					onCheckedChange={() => onSortSelection('SERIES')}
					className="text-foreground"
				>
					<View className="flex w-full">
						<View className="gap-4 flex flex-1 flex-row items-center">
							<Icon as={LibraryBig} size={20} className="text-foreground-muted ml-auto" />
							{renderSortText(
								t(getSortKey('sortBy.SERIES')),
								renderAndroidSortLabel('SERIES', sortConfig.direction),
							)}
						</View>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuSeparator variant="group" />

				<DropdownMenuItem
					onPress={onSelect}
					className="text-foreground"
					disabled={downloadsCount === 0}
				>
					<View className="gap-4 flex w-full flex-row items-center justify-between">
						<View className="gap-4 flex flex-row items-center">
							<Icon as={CheckCircle} size={20} className="text-foreground-muted ml-auto" />
							<Text className="text-lg">{t('common.select')}</Text>
						</View>
					</View>
				</DropdownMenuItem>

				<DropdownMenuItem onPress={onSync} className="text-foreground">
					<View className="gap-4 flex w-full flex-row items-center justify-between">
						<View className="gap-4 flex flex-row items-center">
							<Icon as={RefreshCw} size={20} className="text-foreground-muted ml-auto" />
							<Text className="text-lg">{t(getActionsKey('attemptSync'))}</Text>
						</View>
					</View>
				</DropdownMenuItem>

				<DropdownMenuItem onPress={onToggleCurated} className="text-foreground">
					<View className="gap-4 flex w-full flex-row items-center justify-between">
						<View className="gap-4 flex flex-row items-center">
							<Icon as={Sparkles} size={20} className="text-foreground-muted ml-auto" />
							<Text className="text-lg">
								{t(getActionsKey(isCuratedDownloadsEnabled ? 'hideCurated' : 'showCurated'))}
							</Text>
						</View>
					</View>
				</DropdownMenuItem>

				{failedDownloadsCount > 0 && (
					<DropdownMenuItem onPress={onSeeProblems} className="text-foreground">
						<View className="gap-4 flex w-full flex-row items-center justify-between">
							<View className="gap-4 flex flex-row items-center">
								<Text className="text-lg">
									{t(getActionsKey('seeProblems'), {
										problemsCount: failedDownloadsCount.toString(),
									})}
								</Text>
								<Icon as={AlertCircle} size={20} className="text-foreground-muted ml-auto" />
							</View>
						</View>
					</DropdownMenuItem>
				)}

				<DropdownMenuSeparator variant="group" />

				<DropdownMenuItem
					onPress={onDeleteAll}
					className="text-foreground"
					disabled={downloadsCount === 0}
				>
					<View className="gap-4 flex w-full flex-row items-center justify-between">
						<View className="gap-4 flex flex-row items-center">
							<Icon as={Trash} size={20} className="text-fill-danger ml-auto" />
							<Text className="text-lg text-fill-danger">
								{t(getActionsKey('deleteAllDownloads.label'))}
							</Text>
						</View>
					</View>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

const SORT_BASE = 'localLibrary.downloadsHeaderSortMenu'
const getSortKey = (key: string) => `${SORT_BASE}.${key}`

const ACTIONS_BASE = 'localLibrary.downloadsHeaderMenu'
const getActionsKey = (key: string) => `${ACTIONS_BASE}.${key}`
