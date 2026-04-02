import { Host, Image } from '@expo/ui/swift-ui'
import {
	ALargeSmall,
	ArrowDownLeft,
	ArrowUpRight,
	Clock,
	CloudDownload,
	FolderInput,
	Library,
	LibraryBig,
	ListFilter,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
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
import { useColors } from '~/lib/constants'
import { useTranslate } from '~/lib/hooks'

import { Icon } from '../ui/icon'
import { DownloadSortOption, DownloadSourceFilter, useDownloadsState } from './store'

export default function DownloadsHeaderSortMenu() {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)

	const sortConfig = useDownloadsState((state) => state.sort)
	const setSortConfig = useDownloadsState((state) => state.setSort)
	const sourceFilter = useDownloadsState((state) => state.sourceFilter)
	const setSourceFilter = useDownloadsState((state) => state.setSourceFilter)

	const insets = useSafeAreaInsets()

	const colors = useColors()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const renderSubtitle = useCallback(
		(option: DownloadSortOption) => {
			if (sortConfig.option !== option) return null

			const sortLocaleKey = option === 'ADDED_AT' ? 'sortDirectionDate' : 'sortDirectionText'
			const content = t(getKey(`${sortLocaleKey}.${sortConfig.direction}`))

			// TODO: Refactor based on how I refactor for Android
			return Platform.select({
				ios: <NativeDropdownMenu.ItemSubtitle>{content}</NativeDropdownMenu.ItemSubtitle>,
				android: <Text className="ml-2 text-sm text-foreground-muted">{content}</Text>,
			})
		},
		[sortConfig, t],
	)

	const handleSelection = useCallback(
		(option: DownloadSortOption) => {
			// If clicking the currently active sort option, toggle direction
			if (sortConfig.option === option) {
				setSortConfig({
					option,
					direction: sortConfig.direction === 'ASC' ? 'DESC' : 'ASC',
				})
			} else {
				// When switching to a different option, always use sensible defaults
				// ADDED_AT should always default to DESC (newest first)
				const sensibleDefaultDirection = option === 'ADDED_AT' ? 'DESC' : 'ASC'
				setSortConfig({ option, direction: sensibleDefaultDirection })
			}
		},
		[setSortConfig, sortConfig],
	)

	const setDirection = useCallback(
		(direction: 'ASC' | 'DESC') => {
			setSortConfig({
				option: sortConfig.option,
				direction,
			})
		},
		[setSortConfig, sortConfig],
	)

	const getFilterLabel = (filter: DownloadSourceFilter) => {
		return t(getKey(`sourceFilter.${filter}`))
	}

	const getFilterIcon = (filter: DownloadSourceFilter) => {
		switch (filter) {
			case 'all':
				return { ios: 'books.vertical' as const, android: Library }
			case 'server':
				return { ios: 'arrow.down.circle' as const, android: CloudDownload }
			case 'imported':
				return { ios: 'folder.badge.plus' as const, android: FolderInput }
		}
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
							onSelect={() => handleSelection('NAME')}
						>
							<NativeDropdownMenu.ItemTitle>
								{t(getKey('sortBy.NAME'))}
							</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'character' }} />
							{renderSubtitle('NAME')}
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.option === 'ADDED_AT'}
							key="sortByRecent"
							onSelect={() => handleSelection('ADDED_AT')}
						>
							<NativeDropdownMenu.ItemTitle>
								{t(getKey('sortBy.ADDED_AT'))}
							</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'clock' }} />
							{renderSubtitle('ADDED_AT')}
						</NativeDropdownMenu.CheckboxItem>

						<NativeDropdownMenu.CheckboxItem
							value={sortConfig.option === 'SERIES'}
							key="sortBySeries"
							onSelect={() => handleSelection('SERIES')}
						>
							<NativeDropdownMenu.ItemTitle>
								{t(getKey('sortBy.SERIES'))}
							</NativeDropdownMenu.ItemTitle>
							<NativeDropdownMenu.ItemIcon ios={{ name: 'books.vertical.fill' }} />
							{renderSubtitle('SERIES')}
						</NativeDropdownMenu.CheckboxItem>
					</NativeDropdownMenu.Group>

					<NativeDropdownMenu.Group>
						{(['all', 'server', 'imported'] as const).map((filter) => (
							<NativeDropdownMenu.CheckboxItem
								key={`filter-${filter}`}
								value={sourceFilter === filter}
								onSelect={() => setSourceFilter(filter)}
							>
								<NativeDropdownMenu.ItemTitle>
									{getFilterLabel(filter)}
								</NativeDropdownMenu.ItemTitle>
								<NativeDropdownMenu.ItemIcon ios={{ name: getFilterIcon(filter).ios }} />
							</NativeDropdownMenu.CheckboxItem>
						))}
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
									as={ListFilter}
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
						checked={sortConfig.option === 'NAME'}
						onCheckedChange={() => handleSelection('NAME')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t(getKey('sortBy.NAME'))}</Text>
						<Icon as={ALargeSmall} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.option === 'ADDED_AT'}
						onCheckedChange={() => handleSelection('ADDED_AT')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t(getKey('sortBy.ADDED_AT'))}</Text>
						<Icon as={Clock} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={sortConfig.option === 'SERIES'}
						onCheckedChange={() => handleSelection('SERIES')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t(getKey('sortBy.SERIES'))}</Text>
						<Icon as={LibraryBig} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuSeparator variant="group" />

					<DropdownMenuCheckboxItem
						// Note: The key here is a bit annoying but it forces a re-render when switching to avoid the
						// onCheckedChange overriding the reasonable default direction when switching sort options
						key={sortConfig.option}
						checked={sortConfig.direction === 'ASC'}
						onCheckedChange={() => {
							setDirection('ASC')
						}}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t(getKey('sortDirectionDate.ASC'))}</Text>
						<Icon as={ArrowUpRight} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						// Note: The key here is a bit annoying but it forces a re-render when switching to avoid the
						// onCheckedChange overriding the reasonable default direction when switching sort options
						key={sortConfig.option}
						checked={sortConfig.direction === 'DESC'}
						onCheckedChange={() => setDirection('DESC')}
						className="text-foreground"
						closeOnPress={false}
					>
						<Text className="text-lg">{t(getKey('sortDirectionDate.DESC'))}</Text>
						<Icon as={ArrowDownLeft} size={20} className="ml-auto text-foreground-muted" />
					</DropdownMenuCheckboxItem>

					<DropdownMenuSeparator variant="group" />

					{(['all', 'server', 'imported'] as const).map((filter) => (
						<DropdownMenuCheckboxItem
							key={`filter-${filter}`}
							checked={sourceFilter === filter}
							onCheckedChange={() => setSourceFilter(filter)}
							className="text-foreground"
							closeOnPress={false}
						>
							<Text className="text-lg">{getFilterLabel(filter)}</Text>
							<Icon
								as={getFilterIcon(filter).android}
								size={20}
								className="ml-auto text-foreground-muted"
							/>
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		),
	})

	// TODO: Use ActionMenu once expo/ui better supports checkbox items with icons
	return Component
}

const LOCALE_BASE = 'localLibrary.downloadsHeaderSortMenu'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
