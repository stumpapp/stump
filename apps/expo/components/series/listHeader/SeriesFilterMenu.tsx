import { LibraryType, ReadingStatus } from '@stump/graphql'
import clone from 'lodash/cloneDeep'
import get from 'lodash/get'
import set from 'lodash/set'
import unset from 'lodash/unset'
import { Book, BookOpen, CheckCircle, ClockFading, Glasses } from 'lucide-react-native'

import { useEntityFilterMenu } from '~/components/filter/EntityFilterMenu'
import { MenuGroupDef } from '~/components/filter/types'
import { useTranslate } from '~/lib/hooks'
import { useSeriesFilterStore } from '~/stores/filters'

export function useSeriesFilterMenu() {
	const { t } = useTranslate()

	const filters = useSeriesFilterStore((store) => store.filters)
	const setFilters = useSeriesFilterStore((store) => store.setFilters)

	const readingStatusFilter = get(filters, 'readingStatus.is')

	const onSetReadingStatusFilter = (status: ReadingStatus) => {
		if (status === ReadingStatus.Abandoned) return

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

	const groups: MenuGroupDef[] = [
		{
			key: 'reading-status',
			inline: true,
			items: [
				{
					key: 'not-started',
					icon: { ios: 'clock.badge', android: ClockFading },
					labelKey: 'filtering.notStarted',
					isOn: readingStatusFilter === ReadingStatus.NotStarted,
					onPress: () => onSetReadingStatusFilter(ReadingStatus.NotStarted),
				},
				{
					key: 'reading',
					icon: { ios: 'eyeglasses', android: Glasses },
					labelKey: 'filtering.currentlyReading',
					isOn: readingStatusFilter === ReadingStatus.Reading,
					onPress: () => onSetReadingStatusFilter(ReadingStatus.Reading),
				},
				{
					key: 'finished',
					icon: { ios: 'checkmark.circle', android: CheckCircle },
					labelKey: 'filtering.finished',
					isOn: readingStatusFilter === ReadingStatus.Finished,
					onPress: () => onSetReadingStatusFilter(ReadingStatus.Finished),
				},
			],
		},
		{
			key: 'content-type',
			title: t('common.content'),
			label: t('common.content'),
			inline: true,
			items: [
				{
					key: 'book',
					icon: { ios: 'book', android: BookOpen },
					labelKey: 'libraryType.BOOK',
					isOn: contentTypeFilter.includes(LibraryType.Book),
					onPress: () => onSetContentFilter(LibraryType.Book),
				},
				{
					key: 'comic',
					// todo: find a pow! (sound effect) icon
					icon: { ios: 'burst', android: Book },
					labelKey: 'libraryType.COMIC',
					isOn: contentTypeFilter.includes(LibraryType.Comic),
					onPress: () => onSetContentFilter(LibraryType.Comic),
				},
				{
					key: 'manga',
					icon: { ios: 'bubble', android: Book },
					labelKey: 'libraryType.MANGA',
					isOn: contentTypeFilter.includes(LibraryType.Manga),
					onPress: () => onSetContentFilter(LibraryType.Manga),
				},
			],
		},
	]

	return useEntityFilterMenu({ groups })
}
