import { LibraryType, ReadingStatus } from '@stump/graphql'
import { Stack, useNavigation } from 'expo-router'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'

import { useTranslate } from '~/lib/hooks'
import { useSeriesFilterStore } from '~/stores/filters'

export function useSeriesFilterMenu() {
	const { t } = useTranslate()

	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (Platform.OS === 'android') {
			// navigation.setOptions({
			// 	// headerLeft: () => <SeriesSortAndDisplayMenu />,
			// })
		}
	}, [navigation])

	// todo: prolly make a separate hook for the setter callbacks to share between menus
	const filters = useSeriesFilterStore((store) => store.filters)
	const setFilters = useSeriesFilterStore((store) => store.setFilters)

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

	const contentTypeFilter = get(filters, 'libraryType.isAnyOf', []) as LibraryType[]

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
			set(adjustedFilters, 'libraryType.isAnyOf', newContentTypes)
		} else {
			unset(adjustedFilters, 'libraryType')
		}

		setFilters(adjustedFilters)
	}

	if (Platform.OS === 'ios') {
		return (
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
		)
	}

	return null
}

function AndroidMenu() {}
