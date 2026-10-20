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
	const { translate } = useTranslate()
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
					label: translate('shared.readingStatus.NOT_STARTED'),
				},
				{
					key: 'reading',
					value: ReadingStatus.Reading,
					icon: { ios: 'eyeglasses', android: Glasses },
					label: translate('shared.readingStatus.READING'),
				},
				{
					key: 'finished',
					value: ReadingStatus.Finished,
					icon: { ios: 'checkmark.circle', android: CheckCircle },
					label: translate('shared.readingStatus.FINISHED'),
				},
			],
		},
	]

	if (libraryType) {
		groups.push({
			key: 'content-type',
			mode: 'multi',
			filterPath: 'series.libraryType.isAnyOf',
			title: translate('shared.common.content'),
			inline: true,
			items: [
				{
					key: 'book',
					value: LibraryType.Book,
					icon: { ios: 'book', android: BookOpen },
					label: translate('shared.libraryType.BOOK'),
				},
				{
					key: 'comic',
					icon: {
						ios: { xcasset: 'comic.bubble' },
						android: ComicBubble,
					},
					value: LibraryType.Comic,
					label: translate('shared.libraryType.COMIC'),
				},
				{
					key: 'manga',
					icon: {
						ios: { xcasset: 'manga' },
						android: Manga,
					},
					value: LibraryType.Manga,
					label: translate('shared.libraryType.MANGA'),
				},
			],
		})
	}

	return useFilterMenu({ filters, setFilters, groups })
}
