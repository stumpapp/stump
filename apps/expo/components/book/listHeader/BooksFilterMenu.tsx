import { LibraryType, ReadingStatus } from '@stump/graphql'
import { BookOpen, CheckCircle, ClockFading, Glasses } from 'lucide-react-native'

import { useFilterMenu } from '~/components/filter/EntityFilterMenu'
import { FilterGroupDef } from '~/components/filter/types'
import { ComicBubble, Manga } from '~/components/icons'
import { useTranslate } from '~/lib/hooks'
import { useBookFilterStore } from '~/stores/filters'

type Params = {
	libraryType?: boolean
}

export function useBooksFilterMenu({ libraryType = true }: Params = {}) {
	const { t } = useTranslate()
	const filters = useBookFilterStore((store) => store.filters)
	const setFilters = useBookFilterStore((store) => store.setFilters)

	const groups: FilterGroupDef[] = [
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
	]

	if (libraryType) {
		groups.push({
			key: 'content-type',
			mode: 'multi',
			filterPath: 'series.libraryType.isAnyOf',
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
					icon: {
						ios: { xcasset: 'comic.bubble' },
						android: ComicBubble,
					},
					value: LibraryType.Comic,
					label: t('libraryType.COMIC'),
				},
				{
					key: 'manga',
					icon: {
						ios: { xcasset: 'manga' },
						android: Manga,
					},
					value: LibraryType.Manga,
					label: t('libraryType.MANGA'),
				},
			],
		})
	}

	return useFilterMenu({ filters, setFilters, groups })
}
