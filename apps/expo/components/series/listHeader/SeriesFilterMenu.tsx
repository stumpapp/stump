import { LibraryType, ReadingStatus } from '@stump/graphql'
import { Book, BookOpen, CheckCircle, ClockFading, Glasses } from 'lucide-react-native'

import { useFilterMenu } from '~/components/filter/EntityFilterMenu'
import { useTranslate } from '~/lib/hooks'
import { useSeriesFilterStore } from '~/stores/filters'

export function useSeriesFilterMenu() {
	const { t } = useTranslate()
	const filters = useSeriesFilterStore((store) => store.filters)
	const setFilters = useSeriesFilterStore((store) => store.setFilters)

	return useFilterMenu({
		filters,
		setFilters,
		groups: [
			{
				key: 'reading-status',
				mode: 'single',
				filterPath: 'readingStatus.is',
				inline: true,
				items: [
					{
						key: 'not-started',
						value: ReadingStatus.NotStarted,
						icon: { ios: 'clock.badge', android: ClockFading },
						label: t('filtering.notStarted'),
					},
					{
						key: 'reading',
						value: ReadingStatus.Reading,
						icon: { ios: 'eyeglasses', android: Glasses },
						label: t('filtering.currentlyReading'),
					},
					{
						key: 'finished',
						value: ReadingStatus.Finished,
						icon: { ios: 'checkmark.circle', android: CheckCircle },
						label: t('filtering.finished'),
					},
				],
			},
			{
				key: 'content-type',
				mode: 'multi',
				filterPath: 'libraryType.isAnyOf',
				title: t('common.content'),
				inline: true,
				items: [
					{
						key: 'book',
						value: LibraryType.Book,
						icon: { ios: 'book', android: BookOpen },
						label: t('libraryType.BOOK'),
					},
					{
						key: 'comic',
						icon: { ios: 'comic.bubble', android: Book },
						value: LibraryType.Comic,
						label: t('libraryType.COMIC'),
					},
					{
						key: 'manga',
						icon: { ios: 'manga', android: Book },
						value: LibraryType.Manga,
						label: t('libraryType.MANGA'),
					},
				],
			},
		],
	})
}
