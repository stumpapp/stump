import { LibraryType, ReadingStatus } from '@stump/graphql'
import { Stack } from 'expo-router'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import { Book, BookOpen, CheckCircle, ClockFading, Glasses, ListFilter } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { Platform } from 'react-native'
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
import { useBookFilterStore } from '~/stores/filters'

export function useBooksFilterMenu() {
	const { t } = useTranslate()

	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const readingStatusFilter = get(filters, 'readingStatus.is')

	const onSetReadingStatusFilter = (status: ReadingStatus) => {
		if (status === ReadingStatus.Abandoned) return // extra caution

		const isAlreadyFilteredForStatus = readingStatusFilter === status
		const adjustedFilters = clone(filters)

		if (isAlreadyFilteredForStatus) {
			unset(adjustedFilters, 'readingStatus')
		} else {
			set(adjustedFilters, `readingStatus.is`, status)
		}

		setFilters(adjustedFilters)
	}

	const contentTypeFilter = get(filters, 'series.libraryType.isAnyOf', [] as LibraryType[])

	// todo: should this be a list? or should it just toggle between as we go?
	// todo: associated types? expose all? idk
	const onSetContentFilter = (contentType: LibraryType) => {
		const isAlreadyFilteredForContentType = contentTypeFilter.includes(contentType)
		const adjustedFilters = clone(filters)

		let newContentTypes: LibraryType[] = []

		if (isAlreadyFilteredForContentType) {
			newContentTypes = contentTypeFilter.filter((type) => type !== contentType)
		} else {
			newContentTypes = [...contentTypeFilter, contentType]
		}

		if (newContentTypes.length) {
			set(adjustedFilters, 'series.libraryType.isAnyOf', newContentTypes)
		} else {
			unset(adjustedFilters, 'series')
		}

		setFilters(adjustedFilters)
	}

	return Platform.select({
		android: (
			<AndroidMenu
				contentTypeFilter={contentTypeFilter}
				readingStatusFilter={readingStatusFilter}
				onSetContentFilter={onSetContentFilter}
				onSetReadingStatusFilter={onSetReadingStatusFilter}
			/>
		),
		ios: (
			<Stack.Toolbar.Menu icon="line.3.horizontal.decrease" key="filter-menu">
				<Stack.Toolbar.Menu inline>
					<Stack.Toolbar.MenuAction
						icon="clock.badge"
						isOn={readingStatusFilter === ReadingStatus.NotStarted}
						onPress={() => onSetReadingStatusFilter(ReadingStatus.NotStarted)}
					>
						{t('filtering.notStarted')}
					</Stack.Toolbar.MenuAction>

					<Stack.Toolbar.MenuAction
						icon="eyeglasses"
						isOn={readingStatusFilter === ReadingStatus.Reading}
						onPress={() => onSetReadingStatusFilter(ReadingStatus.Reading)}
					>
						{t('filtering.currentlyReading')}
					</Stack.Toolbar.MenuAction>

					<Stack.Toolbar.MenuAction
						icon="checkmark.circle"
						isOn={readingStatusFilter === ReadingStatus.Finished}
						onPress={() => onSetReadingStatusFilter(ReadingStatus.Finished)}
					>
						{t('filtering.finished')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>

				<Stack.Toolbar.Menu inline title="Content">
					<Stack.Toolbar.MenuAction
						icon="book"
						onPress={() => onSetContentFilter(LibraryType.Book)}
						isOn={contentTypeFilter.includes(LibraryType.Book)}
					>
						{t('libraryType.BOOK')}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						// todo: find a POW icon, like a spiky bubble
						// like apple books -> store -> sections
						// kinda looks like burst, but less uniform and has !?! inside
						icon="burst"
						onPress={() => onSetContentFilter(LibraryType.Comic)}
						isOn={contentTypeFilter.includes(LibraryType.Comic)}
					>
						{t('libraryType.COMIC')}
					</Stack.Toolbar.MenuAction>
					{/*what icon to use...*/}
					<Stack.Toolbar.MenuAction
						icon="bubble"
						onPress={() => onSetContentFilter(LibraryType.Manga)}
						isOn={contentTypeFilter.includes(LibraryType.Manga)}
					>
						{t('libraryType.MANGA')}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			</Stack.Toolbar.Menu>
		),
	})
}

type AndroidProps = {
	contentTypeFilter: LibraryType[]
	readingStatusFilter?: ReadingStatus
	onSetContentFilter: (contentType: LibraryType) => void
	onSetReadingStatusFilter: (status: ReadingStatus) => void
}

function AndroidMenu({
	contentTypeFilter,
	readingStatusFilter,
	onSetContentFilter,
	onSetReadingStatusFilter,
}: AndroidProps) {
	const { t } = useTranslate()

	const [isOpen, setIsOpen] = useState(false)
	const insets = useSafeAreaInsets()

	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
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
				<DropdownMenuCheckboxItem
					checked={readingStatusFilter === ReadingStatus.NotStarted}
					onCheckedChange={() => onSetReadingStatusFilter(ReadingStatus.NotStarted)}
					className="text-foreground"
				>
					<View className="gap-4 flex flex-row items-center">
						<Icon as={ClockFading} size={20} className="text-foreground-muted" />
						<Text className="text-lg">{t('filtering.notStarted')}</Text>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuCheckboxItem
					checked={readingStatusFilter === ReadingStatus.Reading}
					onCheckedChange={() => onSetReadingStatusFilter(ReadingStatus.Reading)}
					className="text-foreground"
				>
					<View className="gap-4 flex flex-row items-center">
						<Icon as={Glasses} size={20} className="text-foreground-muted" />
						<Text className="text-lg">{t('filtering.currentlyReading')}</Text>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuCheckboxItem
					checked={readingStatusFilter === ReadingStatus.Finished}
					onCheckedChange={() => onSetReadingStatusFilter(ReadingStatus.Finished)}
					className="text-foreground"
				>
					<View className="gap-4 flex flex-row items-center">
						<Icon as={CheckCircle} size={20} className="text-foreground-muted" />
						<Text className="text-lg">{t('filtering.finished')}</Text>
					</View>
				</DropdownMenuCheckboxItem>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-foreground-muted">
						{t('common.content')}
					</DropdownMenuLabel>

					<DropdownMenuCheckboxItem
						checked={contentTypeFilter.includes(LibraryType.Book)}
						onCheckedChange={() => onSetContentFilter(LibraryType.Book)}
						className="text-foreground"
					>
						<View className="gap-4 flex flex-row items-center">
							<Icon as={BookOpen} size={20} className="text-foreground-muted" />
							<Text className="text-lg">{t('libraryType.BOOK')}</Text>
						</View>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={contentTypeFilter.includes(LibraryType.Comic)}
						onCheckedChange={() => onSetContentFilter(LibraryType.Comic)}
						className="text-foreground"
					>
						<View className="gap-4 flex flex-row items-center">
							<Icon
								// TODO: find an icon
								as={Book}
								size={20}
								className="text-foreground-muted"
							/>
							<Text className="text-lg">{t('libraryType.COMIC')}</Text>
						</View>
					</DropdownMenuCheckboxItem>

					<DropdownMenuCheckboxItem
						checked={contentTypeFilter.includes(LibraryType.Manga)}
						onCheckedChange={() => onSetContentFilter(LibraryType.Manga)}
						className="text-foreground"
					>
						<View className="gap-4 flex flex-row items-center">
							<Icon
								// TODO: find an icon
								as={Book}
								size={20}
								className="text-foreground-muted"
							/>
							<Text className="text-lg">{t('libraryType.MANGA')}</Text>
						</View>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
