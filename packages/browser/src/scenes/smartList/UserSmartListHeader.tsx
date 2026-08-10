import { useLocaleContext } from '@stump/i18n'
import { Book, Layers, Library } from 'lucide-react'

import { EntityHeader } from '@/components/sharedLayout'

import { useSmartListContext } from './context'
import { usePrefetchSmartList } from './graphql'

const LOCALE_BASE_KEY = 'userSmartListScene.navigation'
const withLocaleKey = (key: string) => `${LOCALE_BASE_KEY}.${key}`

export default function UserSmartListHeader() {
	const { t } = useLocaleContext()
	const {
		list: { id, name },
		meta,
	} = useSmartListContext()
	const { prefetch } = usePrefetchSmartList()

	const tabs = [
		{
			isActive: !!location.pathname.match(/\/smart-lists\/[^/]+(\/items)?$/),
			label: t(withLocaleKey('items')),
			onHover: () => prefetch({ id }),
			to: 'items',
		},
	]

	const resolvedStats = meta
		? [
				{
					key: 'bookCount',
					icon: Book,
					value: meta.matchedBooks,
				},
				{
					key: 'seriesCount',
					icon: Layers,
					value: meta.matchedSeries,
				},
				{
					key: 'libraryCount',
					icon: Library,
					value: meta.matchedLibraries,
				},
			]
		: undefined

	return <EntityHeader name={name} tabs={tabs} stats={resolvedStats} settingsLink="settings" />
}
