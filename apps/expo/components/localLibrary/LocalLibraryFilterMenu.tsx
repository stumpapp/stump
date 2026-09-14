import { CloudDownload, FolderInput, Library } from 'lucide-react-native'

import { useEntityFilterMenu } from '~/components/filter/EntityFilterMenu'
import { useTranslate } from '~/lib/hooks'

import { DownloadSourceFilter, useDownloadsState } from './store'

export function useLocalLibraryFilterMenu() {
	const { t } = useTranslate()

	const sourceFilter = useDownloadsState((state) => state.sourceFilter)
	const setSourceFilter = useDownloadsState((state) => state.setSourceFilter)

	return useEntityFilterMenu({
		groups: [
			{
				key: 'source-filter',
				inline: true,
				items: SORT_ITEMS.map((opt) => ({
					key: opt.key,
					label: t(getKey(opt.key)),
					icon: opt.icon,
					isOn: sourceFilter === opt.key,
					onPress: () => setSourceFilter(opt.key),
				})),
			},
		],
	})
}

const LOCALE_BASE = 'localLibrary.downloadsHeaderSortMenu.sourceFilter'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`

const SORT_ITEMS = [
	{
		key: 'all' satisfies DownloadSourceFilter,
		icon: { ios: 'books.vertical' as const, android: Library },
	},
	{
		key: 'server' satisfies DownloadSourceFilter,
		icon: { ios: 'arrow.down.circle' as const, android: CloudDownload },
	},
	{
		key: 'imported' satisfies DownloadSourceFilter,
		icon: { ios: 'folder.badge.plus' as const, android: FolderInput },
	},
] as const
